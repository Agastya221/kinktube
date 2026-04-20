package handlers

import (
	"context"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/redis/go-redis/v9"

	"kinktube/internal/database"
	"kinktube/internal/models"
	"kinktube/internal/services"
)

const defaultListPerPage = 24

const (
	categoryBootstrapTargetPages = 3
	categoryBootstrapMaxPages    = 4
	categoryBootstrapTTL         = 15 * time.Minute
)

func menuCategoryThumbnailQueryKey(slug string) string {
	query := services.EnhanceQueryForBDSM(models.CategorySearchQuery(slug))
	return "thumb-v3:" + query + ":top-rated-first"
}

func normalizeSearchDedupText(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	value = strings.ReplaceAll(value, "-", " ")
	return strings.Join(strings.Fields(value), " ")
}

func normalizeURL(rawURL string) string {
	rawURL = strings.ToLower(strings.TrimSpace(rawURL))
	// Remove protocol and www prefix for better matching
	rawURL = strings.TrimPrefix(rawURL, "https://")
	rawURL = strings.TrimPrefix(rawURL, "http://")
	rawURL = strings.TrimPrefix(rawURL, "www.")
	// Remove trailing slash
	rawURL = strings.TrimSuffix(rawURL, "/")
	return rawURL
}

func buildSearchDedupKeys(ev *services.EpornerVideo) []string {
	keys := make([]string, 0, 6)

	if ev.ID != "" {
		keys = append(keys, "id:"+ev.ID)
	}

	if ev.URL != "" {
		keys = append(keys, "url:"+normalizeURL(ev.URL))
	}

	if ev.Embed != "" {
		keys = append(keys, "embed:"+normalizeURL(ev.Embed))
	}

	titleKey := normalizeSearchDedupText(ev.Title)
	if titleKey == "" {
		return keys
	}

	// Title + duration is a strong match
	keys = append(keys, "title-duration:"+titleKey+"|"+strconv.Itoa(ev.LengthSec))

	// Also dedupe by just title if it's longer (unique enough)
	if len(titleKey) > 40 {
		keys = append(keys, "title-long:"+titleKey)
	}

	thumbKey := strings.ToLower(strings.TrimSpace(ev.DefaultThumb.Src))
	if thumbKey != "" {
		keys = append(keys, "title-thumb:"+titleKey+"|"+thumbKey)
	}

	return keys
}

func searchResultSeen(seen map[string]struct{}, keys []string) bool {
	for _, key := range keys {
		if _, ok := seen[key]; ok {
			return true
		}
	}

	return false
}

func markSearchResultSeen(seen map[string]struct{}, keys []string) {
	for _, key := range keys {
		seen[key] = struct{}{}
	}
}

func matchesLiveSearchResult(ev *services.EpornerVideo, query string, isBDSMQuery bool) bool {
	if isBDSMQuery {
		return services.MatchesTopicAndBDSM(ev, query)
	}

	return services.MatchesQueryIntent(ev, query) &&
		services.IsRelevantBDSMVideo(ev) &&
		services.IsStrongBDSMMatch(ev)
}

func (h *Handler) cacheVideoRecord(ctx context.Context, video *models.Video) {
	if video == nil {
		return
	}

	if video.ID != 0 {
		_ = h.cache.Set(ctx, database.VideoCacheKey(video.ID), video)
	}

	if video.ExternalID != "" {
		_ = h.cache.Set(ctx, database.VideoExternalCacheKey(video.ExternalID), video)
	}
}

func (h *Handler) resolveVideoIdentifier(ctx context.Context, rawID string) (*models.Video, error) {
	rawID = strings.TrimSpace(rawID)
	if rawID == "" {
		return nil, nil
	}

	if numericID, err := strconv.ParseInt(rawID, 10, 64); err == nil {
		var cached models.Video
		if err := h.cache.Get(ctx, database.VideoCacheKey(numericID), &cached); err == nil {
			return &cached, nil
		}

		video, err := h.db.GetVideoByID(ctx, numericID)
		if err != nil {
			return nil, err
		}
		if video != nil {
			h.cacheVideoRecord(ctx, video)
			return video, nil
		}
	}

	var cached models.Video
	if err := h.cache.Get(ctx, database.VideoExternalCacheKey(rawID), &cached); err == nil {
		if cached.ID == 0 {
			if _, err := h.db.UpsertVideo(ctx, &cached); err != nil {
				return nil, err
			}
		}
		h.cacheVideoRecord(ctx, &cached)
		return &cached, nil
	}

	video, err := h.db.GetVideoByExternalID(ctx, rawID)
	if err != nil {
		return nil, err
	}
	if video != nil {
		h.cacheVideoRecord(ctx, video)
	}

	return video, nil
}

func (h *Handler) backfillVisibleLiveVideos(videos []models.Video) {
	if len(videos) == 0 {
		return
	}

	videoCopies := make([]models.Video, len(videos))
	copy(videoCopies, videos)

	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		for _, video := range videoCopies {
			if video.ExternalID == "" {
				continue
			}

			videoCopy := video
			if _, err := h.db.UpsertVideo(ctx, &videoCopy); err != nil {
				continue
			}
			h.cacheVideoRecord(ctx, &videoCopy)
		}
	}()
}

func (h *Handler) getRelevantCategoryThumbnail(c *fiber.Ctx, slug string) string {
	query := models.CategorySearchQuery(slug)

	searchAttempts := []*services.SearchOptions{
		{Order: "top-rated"},
		nil,
	}

	for _, opts := range searchAttempts {
		response, err := h.eporner.SearchVideosWithOptions(c.Context(), query, 1, 12, opts)
		if err != nil {
			continue
		}

		seen := make(map[string]struct{})

		for _, ev := range response.Videos {
			keys := buildSearchDedupKeys(&ev)
			if searchResultSeen(seen, keys) {
				continue
			}

			if !services.MatchesTopicAndBDSM(&ev, query) {
				continue
			}

			markSearchResultSeen(seen, keys)
			video := services.ConvertToVideo(&ev, query)
			if video.ThumbnailLg != "" {
				return video.ThumbnailLg
			}
			if video.Thumbnail != "" {
				return video.Thumbnail
			}
		}
	}

	return ""
}

func categoryBootstrapCacheKey(slug string) string {
	return "category:bootstrap:v1:" + slug
}

func desiredCategoryInventory(page, perPage int) int64 {
	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = defaultListPerPage
	}

	targetPages := page + 1
	if targetPages < categoryBootstrapTargetPages {
		targetPages = categoryBootstrapTargetPages
	}

	return int64(targetPages * perPage)
}

func shouldBootstrapCategory(result *models.VideoListResponse, page, perPage int) bool {
	if result == nil {
		return false
	}

	if len(result.Videos) < perPage {
		return true
	}

	return result.Total < desiredCategoryInventory(page, perPage)
}

func (h *Handler) invalidateBrowseCaches(ctx context.Context) {
	_ = h.cache.DeletePattern(ctx, "videos:*")
	_ = h.cache.DeletePattern(ctx, "categories:*")
	_ = h.cache.Delete(ctx, database.CacheKeyTotalCount)
	_ = h.cache.Delete(ctx, database.CacheKeyMenuCategories)
}

func (h *Handler) topUpCategoryInventory(
	c *fiber.Ctx,
	category string,
	page, perPage int,
	sortBy string,
	current *models.VideoListResponse,
) *models.VideoListResponse {
	if category == "" || current == nil || !shouldBootstrapCategory(current, page, perPage) {
		return current
	}

	cooldownKey := categoryBootstrapCacheKey(category)
	if h.cache.Exists(c.Context(), cooldownKey) {
		return current
	}

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	query := models.CategorySearchQuery(category)
	missingInventory := int(desiredCategoryInventory(page, perPage) - current.Total)
	pagesToFetch := 1
	if missingInventory > 100 {
		pagesToFetch = (missingInventory + 99) / 100
	}
	if pagesToFetch > categoryBootstrapMaxPages {
		pagesToFetch = categoryBootstrapMaxPages
	}

	opts := &services.SearchOptions{Order: "latest"}
	persistedAny := false

	for sourcePage := 1; sourcePage <= pagesToFetch; sourcePage++ {
		response, err := h.eporner.SearchVideosWithOptions(ctx, query, sourcePage, 100, opts)
		if err != nil {
			break
		}

		if len(response.Videos) == 0 {
			break
		}

		for _, ev := range response.Videos {
			if !services.MatchesTopicAndBDSM(&ev, query) {
				continue
			}

			video := services.ConvertToVideo(&ev, query)
			if video.Thumbnail == "" && video.ThumbnailLg == "" {
				continue
			}

			if _, err := h.db.UpsertVideo(ctx, video); err != nil {
				continue
			}

			persistedAny = true
			h.cacheVideoRecord(ctx, video)
		}

		responsePerPage := response.PerPage
		if responsePerPage <= 0 {
			responsePerPage = 100
		}

		if len(response.Videos) < responsePerPage || (response.Page*responsePerPage) >= response.Count {
			break
		}
	}

	if !persistedAny {
		_ = h.cache.SetWithTTL(ctx, cooldownKey, true, categoryBootstrapTTL)
		return current
	}

	refreshed, err := h.db.ListVideos(ctx, page, perPage, sortBy, category, "")
	if err != nil {
		return current
	}

	if refreshed.Total > current.Total || len(refreshed.Videos) > len(current.Videos) {
		h.invalidateBrowseCaches(ctx)
		_ = h.cache.Delete(ctx, cooldownKey)
		return refreshed
	}

	_ = h.cache.SetWithTTL(ctx, cooldownKey, true, categoryBootstrapTTL)
	return current
}

// ListVideos handles GET /api/videos
func (h *Handler) ListVideos(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	perPage, _ := strconv.Atoi(c.Query("per_page", strconv.Itoa(defaultListPerPage)))
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
		if category != "" {
			return c.JSON(h.topUpCategoryInventory(c, category, page, perPage, sortBy, &cached))
		}

		return c.JSON(cached)
	}

	result, err := h.db.ListVideos(c.Context(), page, perPage, sortBy, category, "")
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch videos",
		})
	}

	if category != "" {
		result = h.topUpCategoryInventory(c, category, page, perPage, sortBy, result)
	}

	_ = h.cache.Set(c.Context(), cacheKey, result)

	return c.JSON(result)
}

// liveSearch queries Eporner API directly and filters for BDSM relevance
func (h *Handler) liveSearch(c *fiber.Ctx, query string, page, perPage int) error {
	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = defaultListPerPage
	}
	if perPage > 100 {
		perPage = 100
	}

	// Get sort preference from query params - empty means let Eporner decide (relevance)
	sortBy := c.Query("sort", "")

	// Enhance query for better BDSM results
	enhancedQuery := services.EnhanceQueryForBDSM(query)

	// Check if the query is BDSM-related
	isBDSMQuery := services.IsBDSMRelatedQuery(query)

	// Try cache first
	cacheKey := database.VideoListCacheKey("search-v6-"+sortBy, page, perPage, "", enhancedQuery)
	var cached models.VideoListResponse
	err := h.cache.Get(c.Context(), cacheKey, &cached)
	if err == nil {
		return c.JSON(cached)
	}

	// Fetch larger Eporner pages because we filter and dedupe aggressively afterwards.
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

	fallbackToDatabase := func() error {
		result, dbErr := h.db.ListVideos(c.Context(), page, perPage, sortBy, "", query)
		if dbErr != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to search videos",
			})
		}
		return c.JSON(result)
	}

	// Build our own filtered pagination so app pages stay aligned with the
	// deduped/relevance-filtered results instead of raw Eporner counts.
	targetStart := (page - 1) * perPage
	targetEnd := targetStart + perPage + 1
	maxSourcePages := (targetEnd / fetchPerPage) + 2
	if maxSourcePages < 2 {
		maxSourcePages = 2
	}
	if maxSourcePages > 6 {
		maxSourcePages = 6
	}

	var matches []models.Video
	seenResults := make(map[string]struct{})
	moreRawResults := false

	for sourcePage := 1; sourcePage <= maxSourcePages && len(matches) < targetEnd; sourcePage++ {
		response, searchErr := h.eporner.SearchVideosWithOptions(c.Context(), enhancedQuery, sourcePage, fetchPerPage, opts)
		if searchErr != nil {
			if sourcePage == 1 {
				return fallbackToDatabase()
			}
			break
		}

		if len(response.Videos) == 0 {
			moreRawResults = false
			break
		}

		responsePerPage := response.PerPage
		if responsePerPage <= 0 {
			responsePerPage = fetchPerPage
		}
		moreRawResults = (response.Page * responsePerPage) < response.Count

		for _, ev := range response.Videos {
			dedupKeys := buildSearchDedupKeys(&ev)
			if searchResultSeen(seenResults, dedupKeys) {
				continue
			}

			if !matchesLiveSearchResult(&ev, query, isBDSMQuery) {
				continue
			}

			video := services.ConvertToVideo(&ev, query)

			// Skip videos without thumbnails
			if video.Thumbnail == "" && video.ThumbnailLg == "" {
				continue
			}

			h.cacheVideoRecord(c.Context(), video)
			markSearchResultSeen(seenResults, dedupKeys)
			matches = append(matches, *video)
			if len(matches) >= targetEnd {
				break
			}
		}

		if !moreRawResults {
			break
		}
	}

	var videos []models.Video
	if targetStart < len(matches) {
		end := targetStart + perPage
		if end > len(matches) {
			end = len(matches)
		}
		videos = matches[targetStart:end]
	} else {
		videos = []models.Video{}
	}

	hasMore := len(matches) > targetStart+perPage || (moreRawResults && len(videos) == perPage)
	total := int64(targetStart + len(videos))
	if hasMore {
		total++
	}
	totalExact := !hasMore
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
		HasMore:    hasMore,
		TotalExact: totalExact,
	}

	h.backfillVisibleLiveVideos(videos)

	// Cache for shorter time for live searches
	_ = h.cache.Set(c.Context(), cacheKey, result)

	return c.JSON(result)
}

// SearchVideos handles GET /api/search - dedicated live search endpoint
func (h *Handler) SearchVideos(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	perPage, _ := strconv.Atoi(c.Query("per_page", strconv.Itoa(defaultListPerPage)))
	query := c.Query("q", "")

	// Cap per_page at 100 for search
	if perPage > 100 {
		perPage = 100
	}

	if query == "" {
		return c.JSON(models.VideoListResponse{
			Videos:     []models.Video{},
			Total:      0,
			Page:       page,
			PerPage:    perPage,
			TotalPages: 0,
			HasMore:    false,
			TotalExact: true,
		})
	}

	return h.liveSearch(c, query, page, perPage)
}

// GetVideo handles GET /api/videos/:id
func (h *Handler) GetVideo(c *fiber.Ctx) error {
	video, err := h.resolveVideoIdentifier(c.Context(), c.Params("id"))
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

	return c.JSON(video)
}

// GetRelatedVideos handles GET /api/videos/:id/related
func (h *Handler) GetRelatedVideos(c *fiber.Ctx) error {
	video, err := h.resolveVideoIdentifier(c.Context(), c.Params("id"))
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

	limit, _ := strconv.Atoi(c.Query("limit", "12"))
	if limit < 1 {
		limit = 12
	}
	if limit > 24 {
		limit = 24
	}

	// Try cache first
	cacheKey := database.RelatedVideosCacheKey(video.ID, limit)
	var cached []models.Video
	err = h.cache.Get(c.Context(), cacheKey, &cached)
	if err == nil {
		return c.JSON(fiber.Map{
			"videos": cached,
		})
	}

	// Fetch from database
	videos, err := h.db.GetRelatedVideos(c.Context(), video.ID, limit)
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

// MenuCategory represents a category with thumbnail for the menu
type MenuCategory struct {
	Slug      string `json:"slug"`
	Name      string `json:"name"`
	Thumbnail string `json:"thumbnail,omitempty"`
}

// GetMenuCategories handles GET /api/menu-categories
// Returns categories with thumbnails for the mobile menu in a single request
func (h *Handler) GetMenuCategories(c *fiber.Ctx) error {
	// Menu categories we want thumbnails for
	menuSlugs := []string{
		"extreme-bondage", "femdom", "bondage", "shibari", "dominatrix",
		"public-humiliation", "slave", "submission", "latex", "vacbed", "pet-play",
		"mummification", "spanking", "cbt", "strapon", "facesitting",
	}

	slugToName := map[string]string{
		"extreme-bondage":    "Extreme Bondage",
		"femdom":             "Femdom",
		"bondage":            "Bondage",
		"shibari":            "Shibari",
		"dominatrix":         "Dominatrix",
		"public-humiliation": "Public Humiliation",
		"slave":              "Slave",
		"submission":         "Submission",
		"latex":              "Latex",
		"vacbed":             "Vacbed",
		"pet-play":           "Pet Play",
		"mummification":      "Mummification",
		"spanking":           "Spanking",
		"cbt":                "CBT",
		"strapon":            "Strapon",
		"facesitting":        "Facesitting",
	}

	// Try cache first
	cacheKey := database.CacheKeyMenuCategories
	var cached []MenuCategory
	err := h.cache.Get(c.Context(), cacheKey, &cached)
	if err == nil {
		return c.JSON(fiber.Map{
			"categories": cached,
		})
	}

	cachedThumbnails, err := h.db.GetCategoryMenuThumbnailMap(c.Context(), menuSlugs)
	if err != nil {
		cachedThumbnails = map[string]database.CategoryMenuThumbnailCache{}
	}

	// Fetch the first relevant video thumbnail for each category
	categories := make([]MenuCategory, 0, len(menuSlugs))
	for _, slug := range menuSlugs {
		cat := MenuCategory{
			Slug: slug,
			Name: slugToName[slug],
		}

		queryKey := menuCategoryThumbnailQueryKey(slug)

		if cachedThumbnail, ok := cachedThumbnails[slug]; ok && cachedThumbnail.QueryKey == queryKey {
			cat.Thumbnail = cachedThumbnail.Thumbnail
		}

		if cat.Thumbnail == "" {
			cat.Thumbnail = h.getRelevantCategoryThumbnail(c, slug)

			// Fall back to the imported DB thumbnail if live search couldn't find one.
			if cat.Thumbnail == "" {
				result, err := h.db.ListVideos(c.Context(), 1, 1, "rating", slug, "")
				if err == nil && len(result.Videos) > 0 {
					if result.Videos[0].ThumbnailLg != "" {
						cat.Thumbnail = result.Videos[0].ThumbnailLg
					} else {
						cat.Thumbnail = result.Videos[0].Thumbnail
					}
				}
			}

			_ = h.db.UpsertCategoryMenuThumbnail(c.Context(), slug, queryKey, cat.Thumbnail)
		}

		categories = append(categories, cat)
	}

	// Cache for 10 minutes
	_ = h.cache.Set(c.Context(), cacheKey, categories)

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
	go h.importer.Run(context.Background())

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
	video, err := h.resolveVideoIdentifier(c.Context(), c.Params("id"))
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
	video, err := h.resolveVideoIdentifier(c.Context(), c.Params("id"))
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

	// Get affiliate links
	links := h.affiliate.GetAffiliateLinks(video.Tags, video.Keywords, 2)

	return c.JSON(fiber.Map{
		"video":           video,
		"affiliate_links": links,
	})
}
