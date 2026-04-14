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

	// Enhance search for better BDSM results
	if search != "" {
		search = services.EnhanceQueryForBDSM(search)
	}

	// Try cache first
	cacheKey := database.VideoListCacheKey(sortBy, page, perPage, category, search)
	var cached models.VideoListResponse
	err := h.cache.Get(c.Context(), cacheKey, &cached)
	if err == nil {
		return c.JSON(cached)
	}

	// Fetch from database
	result, err := h.db.ListVideos(c.Context(), page, perPage, sortBy, category, search)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch videos",
		})
	}

	// Cache the result
	_ = h.cache.Set(c.Context(), cacheKey, result)

	return c.JSON(result)
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
