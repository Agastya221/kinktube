package services

import (
	"context"
	"fmt"
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
	db                 *database.PostgresDB
	cache              *database.RedisCache
	eporner            *EpornerClient
	ai                 *AIDescriptionService
	perPage            int
	maxPages           int
	lightMaxPages      int
	lightKeywordLimit  int
	running            atomic.Bool
	seoBackfillRunning atomic.Bool
	seoBackfillCancel  context.CancelFunc
	seoBackfillMu      sync.Mutex
	mu                 sync.Mutex

	// Dead-video cleanup state
	cleanupRunning   atomic.Bool
	cleanupCancel    context.CancelFunc
	cleanupMu        sync.Mutex
	cleanupStartedAt time.Time

	// Daily token budget tracking (for free-tier compliance)
	tokenMu          sync.Mutex
	dailyTokensUsed  int64
	tokenResetDate   string // UTC date string "2006-01-02"
	dailyTokenBudget int64
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

// SEOBackfillStats tracks automatic AI SEO backfill work.
type SEOBackfillStats struct {
	StartTime    time.Time
	EndTime      time.Time
	Checked      int
	Updated      int
	Rejected     int
	Errors       int
	TokensUsed   int64
	BudgetPaused bool   // true if stopped due to daily token budget
	Completed    bool   // true when there are no more videos missing descriptions
	ResumeAfter  string // UTC time string when budget resets
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
	dailyTokenBudget int,
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
		dailyTokenBudget:  int64(dailyTokenBudget),
		tokenResetDate:    todayUTC(),
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

	if i.cache == nil {
		return nil
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

// IsSEOBackfillRunning returns whether automatic AI SEO backfill is active.
func (i *Importer) IsSEOBackfillRunning() bool {
	return i.seoBackfillRunning.Load()
}

// estimatedTokensPerVideo is the average tokens used per SEO generation call
// (system prompt + video metadata input + JSON output ≈ 750 tokens).
const estimatedTokensPerVideo = 750

// todayUTC returns the current UTC date as a string.
func todayUTC() string {
	return time.Now().UTC().Format("2006-01-02")
}

// nextUTCMidnight returns the time of the next UTC midnight.
func nextUTCMidnight() time.Time {
	now := time.Now().UTC()
	return time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, time.UTC)
}

// trySpendTokens attempts to spend tokens from the daily budget.
// Returns true if the tokens were spent, false if the budget is exhausted.
// If dailyTokenBudget is 0, spending is unlimited.
func (i *Importer) trySpendTokens(amount int64) bool {
	i.tokenMu.Lock()
	defer i.tokenMu.Unlock()

	// Reset counter if the UTC date has changed
	today := todayUTC()
	if i.tokenResetDate != today {
		log.Printf("AI SEO token budget reset for new UTC day %s (previous: %s, used: %d)",
			today, i.tokenResetDate, i.dailyTokensUsed)
		i.dailyTokensUsed = 0
		i.tokenResetDate = today
	}

	// Unlimited if budget is 0
	if i.dailyTokenBudget <= 0 {
		i.dailyTokensUsed += amount
		return true
	}

	// Check if spending would exceed the budget
	if i.dailyTokensUsed+amount > i.dailyTokenBudget {
		return false
	}

	i.dailyTokensUsed += amount
	return true
}

// getDailyTokenUsage returns the current token usage and budget for logging.
func (i *Importer) getDailyTokenUsage() (used int64, budget int64) {
	i.tokenMu.Lock()
	defer i.tokenMu.Unlock()
	return i.dailyTokensUsed, i.dailyTokenBudget
}

// GetDailyTokenUsagePublic is the exported version for API handlers.
func (i *Importer) GetDailyTokenUsagePublic() (used int64, budget int64) {
	return i.getDailyTokenUsage()
}

// ResetDailyTokenUsage clears the tracked daily token usage, allowing the process to start fresh.
func (i *Importer) ResetDailyTokenUsage() {
	i.tokenMu.Lock()
	defer i.tokenMu.Unlock()
	i.dailyTokensUsed = 0
	i.tokenResetDate = time.Now().UTC().Format("2006-01-02")
}

// BackfillMissingDescriptions generates cached SEO descriptions for existing videos.
// It loops through batches until all videos are processed or the daily token budget
// is exhausted. When the budget is hit, it logs the pause and returns.
func (i *Importer) BackfillMissingDescriptions(ctx context.Context, limit int, delay time.Duration) *SEOBackfillStats {
	if i.ai == nil || !i.ai.IsEnabled() {
		log.Println("AI SEO backfill skipped because AI service is disabled")
		return nil
	}
	if !i.seoBackfillRunning.CompareAndSwap(false, true) {
		log.Println("AI SEO backfill already running, skipping")
		return nil
	}
	defer i.seoBackfillRunning.Store(false)

	if limit < 1 {
		limit = 25
	}
	if delay < 0 {
		delay = 0
	}

	stats := &SEOBackfillStats{StartTime: time.Now()}
	totalProcessed := 0

	// Loop through batches until done or budget exhausted
	for {
		// Check context cancellation
		select {
		case <-ctx.Done():
			stats.EndTime = time.Now()
			log.Printf("AI SEO backfill cancelled: %d updated, %d rejected, %d errors, ~%d tokens used",
				stats.Updated, stats.Rejected, stats.Errors, stats.TokensUsed)
			return stats
		default:
		}

		// Check if we have budget for at least one more video
		if !i.trySpendTokens(0) {
			resume := nextUTCMidnight()
			stats.BudgetPaused = true
			stats.ResumeAfter = resume.Format(time.RFC3339)
			stats.EndTime = time.Now()
			used, budget := i.getDailyTokenUsage()
			log.Printf("🛑 AI SEO backfill PAUSED: daily token budget reached (%d / %d tokens). "+
				"Processed %d videos today. Will resume after %s UTC.",
				used, budget, totalProcessed, resume.Format("15:04"))
			return stats
		}

		// Fetch next batch of videos missing descriptions
		videos, err := i.db.ListVideosMissingDescriptions(ctx, limit)
		if err != nil {
			stats.Errors++
			stats.EndTime = time.Now()
			log.Printf("AI SEO backfill failed to list videos: %v", err)
			return stats
		}

		if len(videos) == 0 {
			stats.Completed = true
			stats.EndTime = time.Now()
			log.Printf("✅ AI SEO backfill COMPLETE: no more missing descriptions! "+
				"Total: %d updated, %d rejected, %d errors, ~%d tokens used (took %v)",
				stats.Updated, stats.Rejected, stats.Errors, stats.TokensUsed,
				stats.EndTime.Sub(stats.StartTime))
			return stats
		}

		stats.Checked += len(videos)
		log.Printf("AI SEO backfill processing batch of %d video(s) [total processed: %d, tokens: ~%d]",
			len(videos), totalProcessed, stats.TokensUsed)

		// Process each video in the batch
		budgetExhausted := false
		for index, video := range videos {
			select {
			case <-ctx.Done():
				stats.EndTime = time.Now()
				log.Printf("AI SEO backfill cancelled mid-batch: %d updated, %d rejected, %d errors",
					stats.Updated, stats.Rejected, stats.Errors)
				return stats
			default:
			}

			// Check daily token budget before each AI call
			if !i.trySpendTokens(estimatedTokensPerVideo) {
				budgetExhausted = true
				break
			}

			metadata, aiErr := i.ai.GenerateSEOMetadata(ctx, video.Title, video.Categories, video.Tags)
			stats.TokensUsed += estimatedTokensPerVideo
			totalProcessed++

			oldDesc := video.Description

			if aiErr != nil {
				stats.Errors++
				log.Printf("AI SEO backfill failed for video id=%d title=%q: %v", video.ID, video.Title, aiErr)
				_ = i.db.InsertAISEOLog(ctx, &database.AISEOLog{
					VideoID: video.ID, VideoTitle: video.Title, Status: "error",
					OldDescription: oldDesc, SafetyNotes: aiErr.Error(),
					TokensUsed: estimatedTokensPerVideo,
				})
			} else if metadata == nil || metadata.Rejected || metadata.Description == "" {
				stats.Rejected++
				safetyNote := ""
				if metadata != nil && metadata.SafetyNotes != "" {
					safetyNote = metadata.SafetyNotes
					log.Printf("AI SEO backfill rejected video id=%d title=%q: %s", video.ID, video.Title, metadata.SafetyNotes)
				}
				_ = i.db.InsertAISEOLog(ctx, &database.AISEOLog{
					VideoID: video.ID, VideoTitle: video.Title, Status: "rejected",
					OldDescription: oldDesc, SafetyNotes: safetyNote,
					TokensUsed: estimatedTokensPerVideo,
				})
			} else if err := i.db.UpdateVideoDescription(ctx, video.ID, metadata.Description); err != nil {
				stats.Errors++
				log.Printf("AI SEO backfill failed to save video id=%d: %v", video.ID, err)
				_ = i.db.InsertAISEOLog(ctx, &database.AISEOLog{
					VideoID: video.ID, VideoTitle: video.Title, Status: "error",
					OldDescription: oldDesc, NewDescription: metadata.Description,
					SafetyNotes: err.Error(), TokensUsed: estimatedTokensPerVideo,
				})
			} else {
				video.Description = metadata.Description
				if i.cache != nil {
					_ = i.cache.Delete(ctx, database.VideoCacheKey(video.ID))
					_ = i.cache.Delete(ctx, database.VideoExternalCacheKey(video.ExternalID))
				}
				stats.Updated++

				// Log the successful update with a description preview
				descPreview := metadata.Description
				if len(descPreview) > 120 {
					descPreview = descPreview[:120] + "..."
				}
				log.Printf("✅ AI SEO updated video id=%d title=%q → %q",
					video.ID, video.Title, descPreview)

				_ = i.db.InsertAISEOLog(ctx, &database.AISEOLog{
					VideoID: video.ID, VideoTitle: video.Title, Status: "updated",
					OldDescription: oldDesc, NewDescription: metadata.Description,
					TokensUsed: estimatedTokensPerVideo,
				})
			}

			if delay > 0 && index < len(videos)-1 {
				select {
				case <-ctx.Done():
					stats.EndTime = time.Now()
					return stats
				case <-time.After(delay):
				}
			}
		}

		// Invalidate caches after each batch
		if stats.Updated > 0 {
			if err := i.invalidateCache(ctx); err != nil {
				log.Printf("AI SEO backfill cache invalidation failed: %v", err)
			}
		}

		// If budget was exhausted mid-batch, pause
		if budgetExhausted {
			resume := nextUTCMidnight()
			stats.BudgetPaused = true
			stats.ResumeAfter = resume.Format(time.RFC3339)
			stats.EndTime = time.Now()
			used, budget := i.getDailyTokenUsage()

			videosRemaining := 0
			if budget > 0 {
				videosRemaining = int((budget - used) / estimatedTokensPerVideo)
			}
			_ = videosRemaining // suppress unused warning

			log.Printf("🛑 AI SEO backfill PAUSED: daily token budget reached (%d / %d tokens). "+
				"Processed %d videos today (%d updated, %d rejected, %d errors). "+
				"Will auto-resume after %s UTC.",
				used, budget, totalProcessed, stats.Updated, stats.Rejected, stats.Errors,
				resume.Format("15:04"))
			return stats
		}

		// Brief pause between batches to avoid hammering the API
		log.Printf("AI SEO backfill batch complete. %d updated so far. Fetching next batch...",
			stats.Updated)
	}
}

// BackfillWithBudgetWait runs BackfillMissingDescriptions in a loop,
// automatically sleeping until the next UTC midnight when the daily
// token budget is exhausted, then resuming.
func (i *Importer) BackfillWithBudgetWait(ctx context.Context, limit int, delay time.Duration) {
	for {
		select {
		case <-ctx.Done():
			log.Println("AI SEO backfill loop stopped: context cancelled")
			return
		default:
		}

		stats := i.BackfillMissingDescriptions(ctx, limit, delay)
		if stats == nil {
			return
		}

		// If we paused due to budget, sleep until midnight UTC + 1 minute buffer
		if stats.BudgetPaused {
			sleepUntil := nextUTCMidnight().Add(1 * time.Minute)
			sleepDuration := time.Until(sleepUntil)
			if sleepDuration > 0 {
				log.Printf("💤 AI SEO backfill sleeping for %v until %s UTC (token budget reset)",
					sleepDuration.Round(time.Minute), sleepUntil.Format("2006-01-02 15:04"))
				select {
				case <-ctx.Done():
					log.Println("AI SEO backfill loop stopped during sleep: context cancelled")
					return
				case <-time.After(sleepDuration):
					log.Println("⏰ AI SEO backfill waking up: new UTC day, token budget reset!")
				}
			}
			continue // loop back to run another day's backfill
		}

		if stats.Completed {
			log.Println("✅ AI SEO backfill fully complete — all videos have descriptions!")
			return
		}

		log.Printf("AI SEO backfill stopped before completion: %d updated, %d rejected, %d errors, ~%d tokens used",
			stats.Updated, stats.Rejected, stats.Errors, stats.TokensUsed)
		return
	}
}

// StartSEOBackfill starts the background backfill loop if it is not already running.
func (i *Importer) StartSEOBackfill(parentCtx context.Context, limit int, delay time.Duration) error {
	if i.ai == nil || !i.ai.IsEnabled() {
		return fmt.Errorf("AI SEO service is disabled")
	}

	i.seoBackfillMu.Lock()
	defer i.seoBackfillMu.Unlock()

	if i.seoBackfillRunning.Load() {
		return fmt.Errorf("AI SEO backfill is already running")
	}
	if i.seoBackfillCancel != nil {
		return fmt.Errorf("AI SEO backfill is already starting or stopping")
	}

	ctx, cancel := context.WithCancel(parentCtx)
	i.seoBackfillCancel = cancel
	myCancel := cancel

	go func() {
		defer func() {
			i.seoBackfillMu.Lock()
			// Only nil the cancel if it's still our cancel (not replaced by a new start)
			if i.seoBackfillCancel != nil {
				// We can't compare funcs, so we track via the bool flag only
				_ = myCancel
				i.seoBackfillCancel = nil
			}
			i.seoBackfillMu.Unlock()
		}()
		i.BackfillWithBudgetWait(ctx, limit, delay)
	}()

	return nil
}

// StopSEOBackfill cancels the currently running backfill loop.
func (i *Importer) StopSEOBackfill() error {
	i.seoBackfillMu.Lock()
	defer i.seoBackfillMu.Unlock()

	if i.seoBackfillCancel != nil {
		i.seoBackfillCancel()
		i.seoBackfillCancel = nil
		return nil
	}

	return fmt.Errorf("AI SEO backfill is not currently running")
}

// FormatTokenBudgetStatus returns a human-readable string of today's token usage.
func (i *Importer) FormatTokenBudgetStatus() string {
	used, budget := i.getDailyTokenUsage()
	if budget <= 0 {
		return fmt.Sprintf("Tokens used today: ~%d (unlimited budget)", used)
	}
	remaining := budget - used
	videosRemaining := remaining / estimatedTokensPerVideo
	pct := float64(used) / float64(budget) * 100
	return fmt.Sprintf("Tokens: ~%d / %d (%.1f%%) — ~%d videos remaining today",
		used, budget, pct, videosRemaining)
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

// StartDeadVideoCleanup starts the cleanup in a background goroutine with a 2-hour timeout.
// Returns an error if a cleanup is already running.
func (i *Importer) StartDeadVideoCleanup() error {
	i.cleanupMu.Lock()
	defer i.cleanupMu.Unlock()

	if i.cleanupRunning.Load() {
		return fmt.Errorf("dead video cleanup is already running")
	}

	// 2-hour safety timeout
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Hour)
	i.cleanupCancel = cancel
	i.cleanupStartedAt = time.Now()

	go func() {
		defer cancel()
		i.CleanDeadVideos(ctx)
	}()

	return nil
}

// StopDeadVideoCleanup cancels any running cleanup.
func (i *Importer) StopDeadVideoCleanup() {
	i.cleanupMu.Lock()
	defer i.cleanupMu.Unlock()

	if i.cleanupCancel != nil {
		i.cleanupCancel()
		i.cleanupCancel = nil
	}
}

// IsCleanupRunning returns whether the cleanup scan is active.
func (i *Importer) IsCleanupRunning() bool {
	return i.cleanupRunning.Load()
}

// CleanupStartedAt returns when the current/last cleanup started.
func (i *Importer) CleanupStartedAt() time.Time {
	i.cleanupMu.Lock()
	defer i.cleanupMu.Unlock()
	return i.cleanupStartedAt
}

// CleanDeadVideos fetches the complete list of removed video IDs from Eporner in a single
// API call, then batch-marks them as unavailable in the database. This replaces the old
// one-by-one per-video check which took hours and hammered the Eporner API.
//
// Runtime depends on catalog size: removed-list cleanup is fast, then validation scans visible rows gently.
// Safe to call concurrently — guarded by an atomic lock.
func (i *Importer) CleanDeadVideos(ctx context.Context) {
	if !i.cleanupRunning.CompareAndSwap(false, true) {
		log.Println("CleanDeadVideos: already running, skipping")
		return
	}
	defer i.cleanupRunning.Store(false)

	start := time.Now()
	var totalMarked int64
	log.Println("CleanDeadVideos: fetching removed video IDs from Eporner...")

	// Single HTTP call - returns all removed IDs across the entire Eporner catalog.
	fetchCtx, cancel := context.WithTimeout(ctx, 90*time.Second)
	removedIDs, err := i.eporner.GetRemovedVideoIDs(fetchCtx)
	cancel()

	if err != nil {
		log.Printf("CleanDeadVideos: failed to fetch removed IDs (continuing with direct validation): %v", err)
	} else if len(removedIDs) == 0 {
		log.Println("CleanDeadVideos: removed IDs list was empty - continuing with direct validation")
	} else {
		log.Printf("CleanDeadVideos: received %d removed IDs from Eporner, running batch DB update...", len(removedIDs))

		// Batch-update the database - a few SQL statements at most.
		marked, err := i.db.MarkVideosUnavailableByExternalIDs(ctx, removedIDs)
		if err != nil {
			log.Printf("CleanDeadVideos: batch DB update failed: %v", err)
		} else {
			totalMarked += marked
			log.Printf("CleanDeadVideos: removed-list update marked %d videos unavailable", marked)
		}
	}

	verified, verifiedMarked := i.cleanDeadVideosByValidation(ctx)
	totalMarked += verifiedMarked

	log.Printf("CleanDeadVideos: done in %v - checked %d removed IDs + verified %d live rows, marked %d videos unavailable",
		time.Since(start).Round(time.Millisecond), len(removedIDs), verified, totalMarked)

	if totalMarked > 0 {
		if err := i.invalidateCache(ctx); err != nil {
			log.Printf("CleanDeadVideos: cache invalidation failed: %v", err)
		}
	}
}

func (i *Importer) cleanDeadVideosByValidation(ctx context.Context) (int64, int64) {
	var checked int64
	var marked int64
	var afterID int64
	const batchSize = 100
	const requestDelay = 250 * time.Millisecond

	log.Println("CleanDeadVideos: validating currently visible videos against Eporner video/get...")

	for {
		if err := ctx.Err(); err != nil {
			log.Printf("CleanDeadVideos: validation stopped: %v", err)
			return checked, marked
		}

		videos, err := i.db.ListVideosForValidation(ctx, afterID, batchSize)
		if err != nil {
			log.Printf("CleanDeadVideos: validation DB scan failed: %v", err)
			return checked, marked
		}
		if len(videos) == 0 {
			return checked, marked
		}

		missingIDs := make([]string, 0, len(videos))
		for _, video := range videos {
			afterID = video.ID
			checked++

			checkCtx, cancel := context.WithTimeout(ctx, 12*time.Second)
			exists, err := i.eporner.VideoExists(checkCtx, video.ExternalID)
			cancel()

			if err != nil {
				log.Printf("CleanDeadVideos: skipped %s during validation: %v", video.ExternalID, err)
			} else if !exists {
				missingIDs = append(missingIDs, video.ExternalID)
			}

			select {
			case <-ctx.Done():
				return checked, marked
			case <-time.After(requestDelay):
			}
		}

		if len(missingIDs) > 0 {
			batchMarked, err := i.db.MarkVideosUnavailableByExternalIDs(ctx, missingIDs)
			if err != nil {
				log.Printf("CleanDeadVideos: validation mark failed: %v", err)
			} else {
				marked += batchMarked
				log.Printf("CleanDeadVideos: validation marked %d/%d missing videos unavailable", batchMarked, len(missingIDs))
			}
		}
	}
}

// StartRemovedVideoTicker runs CleanDeadVideos immediately (startup purge) and then
// repeats every `interval`. It is completely non-blocking — all work happens in a
// background goroutine so the HTTP server is unaffected.
//
// Call this once from main after the database and Eporner client are initialised.
func (i *Importer) StartRemovedVideoTicker(ctx context.Context, interval time.Duration) {
	if interval <= 0 {
		interval = 30 * time.Minute
	}

	go func() {
		// Run immediately on startup so the catalog is clean before the first user arrives.
		i.CleanDeadVideos(ctx)

		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				log.Println("CleanDeadVideos ticker stopped (context cancelled)")
				return
			case <-ticker.C:
				i.CleanDeadVideos(ctx)
			}
		}
	}()
}
