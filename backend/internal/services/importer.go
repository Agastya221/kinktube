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
	db       *database.PostgresDB
	cache    *database.RedisCache
	eporner  *EpornerClient
	perPage  int
	running  atomic.Bool
	mu       sync.Mutex
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
func NewImporter(db *database.PostgresDB, cache *database.RedisCache, eporner *EpornerClient, perPage int) *Importer {
	return &Importer{
		db:      db,
		cache:   cache,
		eporner: eporner,
		perPage: perPage,
	}
}

// Run executes the import job
func (i *Importer) Run(ctx context.Context) *ImportStats {
	// Prevent concurrent runs
	if !i.running.CompareAndSwap(false, true) {
		log.Println("Import already running, skipping")
		return nil
	}
	defer i.running.Store(false)

	stats := &ImportStats{
		StartTime: time.Now(),
	}

	keywords := models.SearchKeywords()

	// Shuffle keywords to vary import order
	shuffledKeywords := make([]string, len(keywords))
	copy(shuffledKeywords, keywords)
	rand.Shuffle(len(shuffledKeywords), func(i, j int) {
		shuffledKeywords[i], shuffledKeywords[j] = shuffledKeywords[j], shuffledKeywords[i]
	})

	log.Printf("Starting import with %d keywords", len(shuffledKeywords))

	for _, keyword := range shuffledKeywords {
		select {
		case <-ctx.Done():
			log.Println("Import cancelled")
			stats.EndTime = time.Now()
			return stats
		default:
		}

		keywordStats := i.importKeyword(ctx, keyword)
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

func (i *Importer) importKeyword(ctx context.Context, keyword string) keywordStats {
	stats := keywordStats{}

	// Fetch multiple pages per keyword for thorough coverage
	maxPages := 3
	for page := 1; page <= maxPages; page++ {
		select {
		case <-ctx.Done():
			return stats
		default:
		}

		response, err := i.eporner.SearchVideos(ctx, keyword, page, i.perPage)
		if err != nil {
			log.Printf("Error fetching keyword %q page %d: %v", keyword, page, err)
			stats.errors++
			continue
		}

		if len(response.Videos) == 0 {
			break // No more results
		}

		stats.found += len(response.Videos)

		for _, ev := range response.Videos {
			video := ConvertToVideo(&ev, keyword)

			err := i.db.UpsertVideo(ctx, video)
			if err != nil {
				log.Printf("Error upserting video %s: %v", video.ExternalID, err)
				stats.errors++
				continue
			}

			if video.AddedAt.IsZero() {
				stats.skipped++ // Was an update, not insert
			} else {
				stats.imported++
			}
		}

		// If we got fewer results than requested, no more pages
		if len(response.Videos) < i.perPage {
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

func (i *Importer) invalidateCache(ctx context.Context) error {
	// Clear all video-related cache keys
	patterns := []string{
		"videos:*",
		"video:*",
		"categories:*",
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
