package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/joho/godotenv"
	"github.com/robfig/cron/v3"

	"kinktube/internal/config"
	"kinktube/internal/database"
	"kinktube/internal/handlers"
	"kinktube/internal/middleware"
	"kinktube/internal/models"
	"kinktube/internal/services"
)

func main() {
	// Load .env file if it exists
	_ = godotenv.Load()

	// Load configuration
	cfg := config.Load()

	// Create context for graceful shutdown
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Initialize PostgreSQL
	log.Println("Connecting to PostgreSQL...")
	db, err := database.NewPostgresDB(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to PostgreSQL: %v", err)
	}
	defer db.Close()

	// Initialize database schema
	if err := db.InitSchema(ctx); err != nil {
		log.Fatalf("Failed to initialize database schema: %v", err)
	}
	log.Println("Database schema initialized")

	backfilled, err := db.BackfillEnglishFlags(ctx, 500)
	if err != nil {
		log.Fatalf("Failed to backfill video language flags: %v", err)
	}
	if backfilled > 0 {
		log.Printf("Backfilled language visibility for %d existing videos", backfilled)
	}

	siteSettings, err := db.GetSiteSettings(ctx, models.DefaultSiteSettings(cfg))
	if err != nil {
		log.Fatalf("Failed to load site settings: %v", err)
	}
	if err := db.SaveSiteSettings(ctx, siteSettings); err != nil {
		log.Fatalf("Failed to persist default site settings: %v", err)
	}

	// Initialize Redis
	log.Println("Connecting to Redis...")
	cache, err := database.NewRedisCache(ctx, cfg.RedisURL, cfg.CacheTTL, cfg.RedisPoolSize, cfg.RedisMinIdleConns)
	if err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}
	defer cache.Close()
	log.Println("Redis connected")

	// Initialize Eporner client
	epornerClient := services.NewEpornerClient(cfg.EpornerBaseURL)

	// Initialize AI description service
	aiService := services.NewAIDescriptionService(cfg.OpenAIAPIKey, cfg.OpenRouterAPIKey, cfg.AIProvider, cfg.AIModel)
	if aiService.IsEnabled() {
		log.Printf("AI SEO service enabled (provider: %s, model: %s)", aiService.Provider(), aiService.Model())
	} else {
		log.Println("AI SEO service disabled (set OPENAI_API_KEY or OPENROUTER_API_KEY to enable)")
	}

	// Initialize importer
	importer := services.NewImporter(
		db,
		cache,
		epornerClient,
		aiService,
		cfg.EpornerPerPage,
		siteSettings.Import.ImportMaxPages,
		siteSettings.Import.LightImportMaxPages,
		siteSettings.Import.LightImportKeywords,
		cfg.AISEODailyTokenBudget,
	)

	// Initialize affiliate service
	affiliateService := services.NewAffiliateService()
	affiliateService.ApplySettings(siteSettings.Affiliates)
	log.Printf("Affiliate service initialized with %d programs", len(affiliateService.GetAllPrograms()))

	// Initialize handlers
	handler := handlers.NewHandler(cfg, db, cache, importer, affiliateService, epornerClient, aiService, siteSettings)

	// Create Fiber app
	startedAt := time.Now()
	app := fiber.New(fiber.Config{
		AppName:       "KinkTube API",
		ServerHeader:  "KinkTube",
		ReadTimeout:   10 * time.Second,
		WriteTimeout:  10 * time.Second,
		IdleTimeout:   120 * time.Second,
		BodyLimit:     4 * 1024 * 1024, // 4MB
		Prefork:       false,           // Set to true in production for better performance
		StrictRouting: true,
	})

	// Pre-middleware probe for Railway/platform latency. If this endpoint is
	// slow in production, the delay is before normal app middleware and routes.
	app.Get("/healthz", func(c *fiber.Ctx) error {
		c.Set("X-KinkTube-Probe", "pre-middleware-v1")
		return c.JSON(fiber.Map{
			"status":     "ok",
			"probe":      "pre-middleware-v1",
			"uptime_sec": int(time.Since(startedAt).Seconds()),
		})
	})

	// Setup middleware
	middleware.Setup(app, cfg.FrontendURL)

	// Setup routes
	setupRoutes(app, handler)

	// Setup cron job for auto-import
	var cronScheduler *cron.Cron
	cronScheduler = cron.New()
	_, err = cronScheduler.AddFunc(cfg.ImportSchedule, func() {
		currentSettings, settingsErr := db.GetSiteSettings(context.Background(), models.DefaultSiteSettings(cfg))
		if settingsErr != nil {
			log.Printf("Warning: failed to load site settings for scheduled import: %v", settingsErr)
			return
		}
		if !currentSettings.Import.ImportEnabled {
			log.Println("Scheduled import skipped because importing is disabled in admin settings")
			return
		}

		importer.UpdateConfig(
			currentSettings.Import.ImportMaxPages,
			currentSettings.Import.LightImportMaxPages,
			currentSettings.Import.LightImportKeywords,
		)

		log.Println("Running scheduled import...")
		importer.Run(context.Background())
		runAutoSEOBackfill(context.Background(), cfg, importer)
	})
	if err != nil {
		log.Printf("Warning: Failed to setup import cron: %v", err)
	} else {
		cronScheduler.Start()
		log.Printf("Import cron scheduled: %s", cfg.ImportSchedule)
	}

	// Daily dead-video cleanup: runs at 3 AM UTC, validates each DB video against Eporner API
	_, err = cronScheduler.AddFunc("0 3 * * *", func() {
		log.Println("Starting daily dead-video cleanup...")
		go importer.CleanDeadVideos(context.Background())
	})
	if err != nil {
		log.Printf("Warning: Failed to setup dead-video cleanup cron: %v", err)
	} else {
		log.Println("Dead-video cleanup cron scheduled: daily at 03:00 UTC")
	}

	// Run startup tasks (initial import or cache refresh)
	go func() {
		time.Sleep(time.Duration(cfg.StartupRefreshDelay) * time.Second)

		count, err := db.GetTotalVideoCount(ctx)
		if err != nil {
			log.Printf("Error checking video count: %v", err)
			return
		}

		if count == 0 && siteSettings.Import.ImportEnabled {
			log.Println("Database empty, running initial import...")
			importer.Run(ctx)
			runAutoSEOBackfill(ctx, cfg, importer)
		} else if cfg.RefreshOnStartup && siteSettings.Import.ImportEnabled {
			log.Println("Running startup cache refresh and light import...")
			// Clear stale cache first
			if err := cache.DeletePattern(ctx, "videos:*"); err != nil {
				log.Printf("Warning: failed to clear video cache: %v", err)
			}
			if err := cache.DeletePattern(ctx, "categories:*"); err != nil {
				log.Printf("Warning: failed to clear category cache: %v", err)
			}
			if err := cache.DeletePattern(ctx, database.CacheKeyMenuCategories); err != nil {
				log.Printf("Warning: failed to clear menu category cache: %v", err)
			}
			if err := db.ClearCategoryMenuThumbnailCache(ctx); err != nil {
				log.Printf("Warning: failed to clear menu thumbnail cache: %v", err)
			}
			// Run light import to get fresh content
			importer.RunLight(ctx)
			runAutoSEOBackfill(ctx, cfg, importer)
		} else {
			runAutoSEOBackfill(ctx, cfg, importer)
		}
	}()

	// Start server in goroutine
	go func() {
		addr := cfg.ServerHost + ":" + cfg.ServerPort
		log.Printf("Starting server on %s", addr)
		if err := app.Listen(addr); err != nil {
			log.Fatalf("Server error: %v", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")

	// Stop cron scheduler
	if cronScheduler != nil {
		cronScheduler.Stop()
	}

	// Cancel context
	cancel()

	// Shutdown Fiber with timeout
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := app.ShutdownWithContext(shutdownCtx); err != nil {
		log.Printf("Server shutdown error: %v", err)
	}

	log.Println("Server stopped")
}

func runAutoSEOBackfill(ctx context.Context, cfg *config.Config, importer *services.Importer) {
	if !cfg.AISEOAutoBackfill {
		return
	}

	if err := importer.StartSEOBackfill(
		ctx,
		cfg.AISEOBackfillBatchSize,
		time.Duration(cfg.AISEOBackfillDelayMS)*time.Millisecond,
	); err != nil {
		log.Printf("Failed to auto-start AI SEO backfill: %v", err)
	}
}

func setupRoutes(app *fiber.App, h *handlers.Handler) {
	// Health check
	app.Get("/health", h.HealthCheck)

	// API routes
	api := app.Group("/api")
	api.Get("/site-settings", h.GetPublicSiteSettings)
	api.Post("/contact", h.CreateContactSubmission)
	api.Get("/admin/session", h.GetAdminSession)
	api.Post("/admin/session/login", h.LoginAdmin)
	api.Post("/admin/session/logout", h.LogoutAdmin)

	// Public routes
	api.Get("/videos", h.ListVideos)
	api.Get("/search", h.SearchVideos) // Live search via Eporner
	api.Get("/videos/:id", h.GetVideo)
	api.Get("/videos/:id/full", h.GetVideoWithAffiliates)
	api.Get("/videos/:id/related", h.GetRelatedVideos)
	api.Get("/videos/:id/affiliates", h.GetAffiliateLinks)
	api.Post("/videos/:id/unavailable", h.ReportVideoUnavailable) // frontend reports dead embeds
	api.Get("/videos/:id/stream", h.GetVideoStream)               // resolve direct HLS/MP4 stream URL
	api.Get("/videos/:id/comments", h.GetVideoComments)
	api.Post("/videos/:id/comments", h.AddVideoComment)
	api.Get("/categories", h.GetCategories)
	api.Get("/menu-categories", h.GetMenuCategories)
	api.Get("/media/thumbnail", h.ProxyThumbnail)
	api.Get("/stats", h.GetStats)

	// Admin routes (in production, add authentication middleware)
	admin := api.Group("/admin")
	admin.Use(h.RequireAdminAuth)
	admin.Get("/settings", h.GetAdminSettings)
	admin.Put("/settings", h.UpdateAdminSettings)
	admin.Get("/messages", h.ListAdminContactSubmissions)
	admin.Patch("/messages/:id", h.UpdateAdminContactSubmissionStatus)
	admin.Post("/import", h.TriggerImport)
	admin.Post("/import/light", h.TriggerLightImport)
	admin.Get("/import/status", h.GetImportStatus)
	admin.Post("/seo/generate", h.GenerateAdminSEO)
	admin.Post("/seo/backfill/start", h.StartAdminSEOBackfill)
	admin.Post("/seo/backfill/stop", h.StopAdminSEOBackfill)
	admin.Post("/seo/backfill/reset", h.ResetAdminSEOBackfill)
	admin.Get("/ai-seo/status", h.GetAISEOStatus)
	admin.Get("/ai-seo/logs", h.GetAISEOLogs)
}
