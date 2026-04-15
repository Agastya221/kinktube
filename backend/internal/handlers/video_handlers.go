package handlers

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/redis/go-redis/v9"

	"kinktube/internal/database"
	"kinktube/internal/models"
	"kinktube/internal/services"
)

// ListVideos handles GET /api/videos
func (h *Handler) ListVideos(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	perPage, _ := strconv.Atoi(c.Query("per_page", "24"))
	sortBy := c.Query("sort", "latest")
	category := c.Query("category", "")
	search := c.Query("q", "")

	// If there's a search query, use live Eporner search
	if search != "" {
		return h.liveSearch(c, search, page, perPage)
	}

	// For non-search requests (browsing), use database
	cacheKey := database.VideoListCacheKey(sortBy, page, perPage, category, "")
	var cached models.VideoListResponse
	err := h.cache.Get(c.Context(), cacheKey, &cached)
	if err == nil {
		return c.JSON(cached)
	}

	result, err := h.db.ListVideos(c.Context(), page, perPage, sortBy, category, "")
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch videos",
		})
	}

	_ = h.cache.Set(c.Context(), cacheKey, result)

	return c.JSON(result)
}

// liveSearch queries Eporner API directly and filters for BDSM relevance
func (h *Handler) liveSearch(c *fiber.Ctx, query string, page, perPage int) error {
	// Get sort preference from query params - empty means let Eporner decide (relevance)
	sortBy := c.Query("sort", "")

	// Enhance query for better BDSM results
	enhancedQuery := services.EnhanceQueryForBDSM(query)

	// Check if the query is BDSM-related
	isBDSMQuery := services.IsBDSMRelatedQuery(query)

	// Try cache first
	cacheKey := database.VideoListCacheKey("search-"+sortBy, page, perPage, "", enhancedQuery)
	var cached models.VideoListResponse
	err := h.cache.Get(c.Context(), cacheKey, &cached)
	if err == nil {
		return c.JSON(cached)
	}

	// Fetch more results from Eporner to account for filtering
	fetchPerPage := perPage * 2
	if fetchPerPage > 100 {
		fetchPerPage = 100
	}

	// Map sort option to Eporner API order
	// Empty string = let Eporner decide based on relevance
	opts := &services.SearchOptions{}
	switch sortBy {
	case "latest":
		opts.Order = "latest"
	case "views":
		opts.Order = "most-popular"
	case "rating":
		opts.Order = "top-rated"
	case "duration":
		opts.Order = "longest"
	default:
		opts.Order = "" // Let Eporner decide (relevance-based)
	}

	response, err := h.eporner.SearchVideosWithOptions(c.Context(), enhancedQuery, page, fetchPerPage, opts)
	if err != nil {
		// Fallback to database search if Eporner fails
		result, dbErr := h.db.ListVideos(c.Context(), page, perPage, sortBy, "", query)
		if dbErr != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to search videos",
			})
		}
		return c.JSON(result)
	}

	// Filter and convert results, tracking seen IDs to prevent duplicates
	var videos []models.Video
	seenIDs := make(map[string]bool)

	for _, ev := range response.Videos {
		// Skip duplicates based on external ID
		if seenIDs[ev.ID] {
			continue
		}

		// For BDSM queries, only include relevant results
		// For non-BDSM queries, heavily filter (show fewer results)
		if isBDSMQuery {
			if services.MatchesTopicAndBDSM(&ev, query) {
				video := services.ConvertToVideo(&ev, query)
				seenIDs[ev.ID] = true
				videos = append(videos, *video)
			}
		} else {
			// Non-BDSM query: only include if it's actually BDSM content
			// This gives limited results for off-topic searches
			if services.MatchesQueryIntent(&ev, query) && services.IsRelevantBDSMVideo(&ev) && services.IsStrongBDSMMatch(&ev) {
				video := services.ConvertToVideo(&ev, query)
				seenIDs[ev.ID] = true
				videos = append(videos, *video)
			}
		}

		// Stop once we have enough results
		if len(videos) >= perPage {
			break
		}
	}

	// Calculate pagination (estimated)
	total := int64(response.Count)
	if !isBDSMQuery {
		// For non-BDSM queries, report fewer total results
		total = int64(len(videos))
	}

	totalPages := int(total) / perPage
	if int(total)%perPage > 0 {
		totalPages++
	}

	result := &models.VideoListResponse{
		Videos:     videos,
		Total:      total,
		Page:       page,
		PerPage:    perPage,
		TotalPages: totalPages,
	}

	// Cache for shorter time for live searches
	_ = h.cache.Set(c.Context(), cacheKey, result)

	return c.JSON(result)
}

// SearchVideos handles GET /api/search - dedicated live search endpoint
func (h *Handler) SearchVideos(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	perPage, _ := strconv.Atoi(c.Query("per_page", "36")) // Default to 36 for search
	query := c.Query("q", "")

	// Cap per_page at 50 for search
	if perPage > 50 {
		perPage = 50
	}

	if query == "" {
		return c.JSON(models.VideoListResponse{
			Videos:     []models.Video{},
			Total:      0,
			Page:       page,
			PerPage:    perPage,
			TotalPages: 0,
		})
	}

	return h.liveSearch(c, query, page, perPage)
}

// GetVideo handles GET /api/videos/:id
func (h *Handler) GetVideo(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid video ID",
		})
	}

	// Try cache first
	cacheKey := database.VideoCacheKey(id)
	var cached models.Video
	err = h.cache.Get(c.Context(), cacheKey, &cached)
	if err == nil {
		return c.JSON(cached)
	}

	// Fetch from database
	video, err := h.db.GetVideoByID(c.Context(), id)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch video",
		})
	}

	if video == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Video not found",
		})
	}

	// Cache the result
	_ = h.cache.Set(c.Context(), cacheKey, video)

	return c.JSON(video)
}

// GetRelatedVideos handles GET /api/videos/:id/related
func (h *Handler) GetRelatedVideos(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid video ID",
		})
	}

	limit, _ := strconv.Atoi(c.Query("limit", "12"))
	if limit > 24 {
		limit = 24
	}

	// Try cache first
	cacheKey := database.RelatedVideosCacheKey(id)
	var cached []models.Video
	err = h.cache.Get(c.Context(), cacheKey, &cached)
	if err == nil {
		return c.JSON(fiber.Map{
			"videos": cached,
		})
	}

	// Fetch from database
	videos, err := h.db.GetRelatedVideos(c.Context(), id, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch related videos",
		})
	}

	if videos == nil {
		videos = []models.Video{}
	}

	// Cache the result
	_ = h.cache.Set(c.Context(), cacheKey, videos)

	return c.JSON(fiber.Map{
		"videos": videos,
	})
}

// GetCategories handles GET /api/categories
func (h *Handler) GetCategories(c *fiber.Ctx) error {
	// Try cache first
	var cached []models.Category
	err := h.cache.Get(c.Context(), database.CacheKeyCategories, &cached)
	if err == nil {
		return c.JSON(fiber.Map{
			"categories": cached,
		})
	}

	// Get stats from database
	stats, err := h.db.GetCategoryStats(c.Context())
	if err != nil && err != redis.Nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch categories",
		})
	}

	// Build response with default categories
	categories := models.GetDefaultCategories()
	for i := range categories {
		if count, ok := stats[categories[i].Slug]; ok {
			categories[i].VideoCount = count
		}
	}

	// Cache the result
	_ = h.cache.Set(c.Context(), database.CacheKeyCategories, categories)

	return c.JSON(fiber.Map{
		"categories": categories,
	})
}

// GetStats handles GET /api/stats
func (h *Handler) GetStats(c *fiber.Ctx) error {
	// Try cache first
	var cached int64
	err := h.cache.Get(c.Context(), database.CacheKeyTotalCount, &cached)
	if err == nil {
		return c.JSON(fiber.Map{
			"total_videos": cached,
		})
	}

	// Get from database
	count, err := h.db.GetTotalVideoCount(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch stats",
		})
	}

	// Cache the result
	_ = h.cache.Set(c.Context(), database.CacheKeyTotalCount, count)

	return c.JSON(fiber.Map{
		"total_videos": count,
	})
}

// TriggerImport handles POST /api/admin/import (protected endpoint)
func (h *Handler) TriggerImport(c *fiber.Ctx) error {
	// Check if import is already running
	if h.importer.IsRunning() {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error":   "Import already in progress",
			"message": "Please wait for the current import to complete",
		})
	}

	// Run import in background
	go h.importer.Run(c.Context())

	return c.JSON(fiber.Map{
		"message": "Import started",
		"status":  "running",
	})
}

// GetImportStatus handles GET /api/admin/import/status
func (h *Handler) GetImportStatus(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"running": h.importer.IsRunning(),
	})
}

// HealthCheck handles GET /health
func (h *Handler) HealthCheck(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"status":  "healthy",
		"service": "kinktube-api",
	})
}

// GetAffiliateLinks handles GET /api/videos/:id/affiliates
// Returns matched affiliate links based on video tags and keywords
func (h *Handler) GetAffiliateLinks(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid video ID",
		})
	}

	// Get the video to access its tags and keywords
	video, err := h.db.GetVideoByID(c.Context(), id)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch video",
		})
	}

	if video == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Video not found",
		})
	}

	// Get affiliate links based on video content
	maxLinks, _ := strconv.Atoi(c.Query("max", "2"))
	if maxLinks <= 0 || maxLinks > 4 {
		maxLinks = 2
	}

	links := h.affiliate.GetAffiliateLinks(video.Tags, video.Keywords, maxLinks)

	return c.JSON(fiber.Map{
		"links": links,
	})
}

// GetVideoWithAffiliates handles GET /api/videos/:id/full
// Returns video data along with matched affiliate links
func (h *Handler) GetVideoWithAffiliates(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid video ID",
		})
	}

	// Try cache first
	cacheKey := database.VideoCacheKey(id)
	var video *models.Video
	var cached models.Video
	err = h.cache.Get(c.Context(), cacheKey, &cached)
	if err == nil {
		video = &cached
	} else {
		// Fetch from database
		video, err = h.db.GetVideoByID(c.Context(), id)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to fetch video",
			})
		}

		if video == nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Video not found",
			})
		}

		// Cache the video
		_ = h.cache.Set(c.Context(), cacheKey, video)
	}

	// Get affiliate links
	links := h.affiliate.GetAffiliateLinks(video.Tags, video.Keywords, 2)

	return c.JSON(fiber.Map{
		"video":           video,
		"affiliate_links": links,
	})
}
