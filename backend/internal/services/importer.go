package services

import (
	"context"
	"log"
	"math/rand"
	"sync"
	"sync/atomic"
	"time"

	"kinktube/internal/database"
	"kinktube/internal/models"
)

// Importer handles the automated video import process
type Importer struct {
	db                *database.PostgresDB
	cache             *database.RedisCache
	eporner           *EpornerClient
	ai                *AIDescriptionService
	perPage           int
	maxPages          int
	lightMaxPages     int
	lightKeywordLimit int
	running           atomic.Bool
	mu                sync.Mutex
}

// ImportStats tracks import statistics
type ImportStats struct {
	StartTime       time.Time
	EndTime         time.Time
	KeywordsQueried int
	VideosFound     int
	VideosImported  int
	VideosSkipped   int
	Errors          int
}

// NewImporter creates a new video importer
func NewImporter(
	db *database.PostgresDB,
	cache *database.RedisCache,
	eporner *EpornerClient,
	ai *AIDescriptionService,
	perPage int,
	maxPages int,
	lightMaxPages int,
	lightKeywordLimit int,
) *Importer {
	if perPage < 1 {
		perPage = 100
	}
	if maxPages < 1 {
		maxPages = 3
	}
	if lightMaxPages < 1 {
		lightMaxPages = 1
	}
	if lightKeywordLimit < 1 {
		lightKeywordLimit = 20
	}

	return &Importer{
		db:                db,
		cache:             cache,
		eporner:           eporner,
		ai:                ai,
		perPage:           perPage,
		maxPages:          maxPages,
		lightMaxPages:     lightMaxPages,
		lightKeywordLimit: lightKeywordLimit,
	}
}

func maxImportPagesFromResponse(response *EpornerResponse, configuredMax int) int {
	if configuredMax < 1 {
		configuredMax = 1
	}
	if response == nil {
		return configuredMax
	}

	responsePerPage := response.PerPage
	if responsePerPage <= 0 {
		responsePerPage = len(response.Videos)
	}
	if responsePerPage <= 0 {
		return 1
	}

	availablePages := response.Count / responsePerPage
	if response.Count%responsePerPage > 0 {
		availablePages++
	}
	if availablePages < 1 {
		availablePages = 1
	}
	if availablePages > configuredMax {
		return configuredMax
	}

	return availablePages
}

// Run executes the import job
func (i *Importer) Run(ctx context.Context) *ImportStats {
	// Prevent concurrent runs
	if !i.running.CompareAndSwap(false, true) {
		log.Println("Import already running, skipping")
		return nil
	}
	defer i.running.Store(false)

	stats := &ImportStats{StartTime: time.Now()}

	queries := models.ImportQueries()

	// Shuffle keywords to vary import order
	shuffledKeywords := make([]string, len(queries))
	copy(shuffledKeywords, queries)
	rand.Shuffle(len(shuffledKeywords), func(i, j int) {
		shuffledKeywords[i], shuffledKeywords[j] = shuffledKeywords[j], shuffledKeywords[i]
	})

	log.Printf("Starting import with %d queries across up to %d pages each", len(shuffledKeywords), i.maxPages)

	for _, keyword := range shuffledKeywords {
		select {
		case <-ctx.Done():
			log.Println("Import cancelled")
			stats.EndTime = time.Now()
			return stats
		default:
		}

		keywordStats := i.importKeywordPages(ctx, keyword, i.maxPages)
		stats.KeywordsQueried++
		stats.VideosFound += keywordStats.found
		stats.VideosImported += keywordStats.imported
		stats.VideosSkipped += keywordStats.skipped
		stats.Errors += keywordStats.errors

		// Small delay between keywords to be nice to the API
		time.Sleep(500 * time.Millisecond)
	}

	stats.EndTime = time.Now()

	log.Printf("Import complete: %d keywords, %d found, %d imported, %d skipped, %d errors (took %v)",
		stats.KeywordsQueried, stats.VideosFound, stats.VideosImported,
		stats.VideosSkipped, stats.Errors, stats.EndTime.Sub(stats.StartTime))

	// Invalidate cache after import
	if err := i.invalidateCache(ctx); err != nil {
		log.Printf("Warning: failed to invalidate cache: %v", err)
	}

	return stats
}

type keywordStats struct {
	found    int
	imported int
	skipped  int
	errors   int
}

func (i *Importer) importKeywordPages(ctx context.Context, keyword string, maxPages int) keywordStats {
	stats := keywordStats{}

	// Importer wants latest content for fresh imports
	opts := &SearchOptions{Order: "latest"}

	targetPages := maxPages
	for page := 1; page <= targetPages; page++ {
		select {
		case <-ctx.Done():
			return stats
		default:
		}

		response, err := i.eporner.SearchVideosWithOptions(ctx, keyword, page, i.perPage, opts)
		if err != nil {
			log.Printf("Error fetching keyword %q page %d: %v", keyword, page, err)
			stats.errors++
			continue
		}

		if len(response.Videos) == 0 {
			break // No more results
		}

		if page == 1 {
			targetPages = maxImportPagesFromResponse(response, maxPages)
		}

		stats.found += len(response.Videos)

		for _, ev := range response.Videos {
			if !MatchesTopicAndBDSM(&ev, keyword) {
				stats.skipped++
				continue
			}

			video := ConvertToVideo(&ev, keyword)

			// Generate AI description for new/missing descriptions
			if i.ai != nil && i.ai.IsEnabled() && video.Description == "" {
				desc, aiErr := i.ai.GenerateDescription(ctx, video.Title, video.Categories, video.Tags)
				if aiErr != nil {
					log.Printf("AI description failed for %q: %v", video.Title, aiErr)
				} else if desc != "" {
					video.Description = desc
				}
			}

			inserted, err := i.db.UpsertVideo(ctx, video)
			if err != nil {
				log.Printf("Error upserting video %s: %v", video.ExternalID, err)
				stats.errors++
				continue
			}

			if inserted {
				stats.imported++
			} else {
				stats.skipped++ // Was an update, not insert
			}
		}

		responsePerPage := response.PerPage
		if responsePerPage <= 0 {
			responsePerPage = i.perPage
		}

		// If we got fewer results than requested or exhausted the available pages, stop.
		if len(response.Videos) < responsePerPage || page >= targetPages {
			break
		}

		// Delay between pages
		time.Sleep(200 * time.Millisecond)
	}

	if stats.imported > 0 {
		log.Printf("Keyword %q: %d found, %d imported, %d skipped",
			keyword, stats.found, stats.imported, stats.skipped)
	}

	return stats
}

func (i *Importer) importKeyword(ctx context.Context, keyword string) keywordStats {
	return i.importKeywordPages(ctx, keyword, i.maxPages)
}

func (i *Importer) invalidateCache(ctx context.Context) error {
	if err := i.db.ClearCategoryMenuThumbnailCache(ctx); err != nil {
		return err
	}

	// Clear all video-related cache keys
	patterns := []string{
		"videos:*",
		"video:*",
		"categories:*",
		database.CacheKeyMenuCategories,
	}

	for _, pattern := range patterns {
		if err := i.cache.DeletePattern(ctx, pattern); err != nil {
			return err
		}
	}

	return nil
}

// IsRunning returns whether an import is currently in progress
func (i *Importer) IsRunning() bool {
	return i.running.Load()
}

// UpdateConfig lets admin settings adjust importer depth without a restart.
func (i *Importer) UpdateConfig(maxPages, lightMaxPages, lightKeywordLimit int) {
	i.mu.Lock()
	defer i.mu.Unlock()

	if maxPages > 0 {
		i.maxPages = maxPages
	}
	if lightMaxPages > 0 {
		i.lightMaxPages = lightMaxPages
	}
	if lightKeywordLimit > 0 {
		i.lightKeywordLimit = lightKeywordLimit
	}
}

// RunSingle imports videos for a single keyword (useful for testing)
func (i *Importer) RunSingle(ctx context.Context, keyword string) *ImportStats {
	if !i.running.CompareAndSwap(false, true) {
		return nil
	}
	defer i.running.Store(false)

	stats := &ImportStats{
		StartTime: time.Now(),
	}

	keywordStats := i.importKeyword(ctx, keyword)
	stats.KeywordsQueried = 1
	stats.VideosFound = keywordStats.found
	stats.VideosImported = keywordStats.imported
	stats.VideosSkipped = keywordStats.skipped
	stats.Errors = keywordStats.errors
	stats.EndTime = time.Now()

	return stats
}

// RunLight executes a lighter import (1 page per keyword) for startup refresh
// This is faster than a full import and good for getting fresh content on restart
func (i *Importer) RunLight(ctx context.Context) *ImportStats {
	if !i.running.CompareAndSwap(false, true) {
		log.Println("Import already running, skipping light import")
		return nil
	}
	defer i.running.Store(false)

	stats := &ImportStats{StartTime: time.Now()}

	queries := models.ImportQueries()

	// Shuffle and limit to first 20 keywords for speed
	shuffledKeywords := make([]string, len(queries))
	copy(shuffledKeywords, queries)
	rand.Shuffle(len(shuffledKeywords), func(i, j int) {
		shuffledKeywords[i], shuffledKeywords[j] = shuffledKeywords[j], shuffledKeywords[i]
	})
	if len(shuffledKeywords) > i.lightKeywordLimit {
		shuffledKeywords = shuffledKeywords[:i.lightKeywordLimit]
	}

	log.Printf(
		"Starting light import with %d queries (%d page(s) each)",
		len(shuffledKeywords),
		i.lightMaxPages,
	)

	for _, keyword := range shuffledKeywords {
		select {
		case <-ctx.Done():
			log.Println("Light import cancelled")
			stats.EndTime = time.Now()
			return stats
		default:
		}

		keywordStats := i.importKeywordPages(ctx, keyword, i.lightMaxPages)
		stats.KeywordsQueried++
		stats.VideosFound += keywordStats.found
		stats.VideosImported += keywordStats.imported
		stats.VideosSkipped += keywordStats.skipped
		stats.Errors += keywordStats.errors

		// Small delay between keywords
		time.Sleep(300 * time.Millisecond)
	}

	stats.EndTime = time.Now()

	log.Printf("Light import complete: %d keywords, %d found, %d imported, %d skipped, %d errors (took %v)",
		stats.KeywordsQueried, stats.VideosFound, stats.VideosImported,
		stats.VideosSkipped, stats.Errors, stats.EndTime.Sub(stats.StartTime))

	// Invalidate cache after import
	if err := i.invalidateCache(ctx); err != nil {
		log.Printf("Warning: failed to invalidate cache: %v", err)
	}

	return stats
}

// CleanDeadVideos validates every video in the DB against the Eporner API
// and marks unavailable ones so they disappear from all listings.
// Runs in batches with delays to avoid rate-limiting. Safe to run daily.
func (i *Importer) CleanDeadVideos(ctx context.Context) {
	log.Println("Starting dead video cleanup scan...")

	const batchSize = 50
	const delayBetweenChecks = 300 * time.Millisecond
	const delayBetweenBatches = 3 * time.Second

	// Fetch all external IDs in chunks via DB pagination
	page := 1
	totalMarked := 0

	for {
		select {
		case <-ctx.Done():
			log.Printf("Dead video cleanup cancelled after marking %d videos", totalMarked)
			return
		default:
		}

		rows, err := i.db.ListVideosForValidation(ctx, page, batchSize)
		if err != nil {
			log.Printf("CleanDeadVideos: failed to list videos page %d: %v", page, err)
			break
		}
		if len(rows) == 0 {
			break
		}

		for _, row := range rows {
			select {
			case <-ctx.Done():
				return
			default:
			}

			checkCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
			exists := i.eporner.VideoExists(checkCtx, row.ExternalID)
			cancel()

			if !exists {
				log.Printf("CleanDeadVideos: marking video id=%d external=%q as unavailable", row.ID, row.ExternalID)
				if err := i.db.MarkVideoUnavailable(ctx, row.ID); err != nil {
					log.Printf("CleanDeadVideos: failed to mark video %d: %v", row.ID, err)
				} else {
					totalMarked++
				}
			}

			time.Sleep(delayBetweenChecks)
		}

		if len(rows) < batchSize {
			break
		}
		page++
		time.Sleep(delayBetweenBatches)
	}

	log.Printf("Dead video cleanup complete: %d videos marked unavailable", totalMarked)

	if totalMarked > 0 {
		if err := i.invalidateCache(ctx); err != nil {
			log.Printf("CleanDeadVideos: cache invalidation failed: %v", err)
		}
	}
}
