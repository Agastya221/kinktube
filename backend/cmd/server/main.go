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

	// Initialize Redis
	log.Println("Connecting to Redis...")
	cache, err := database.NewRedisCache(ctx, cfg.RedisURL, cfg.CacheTTL)
	if err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}
	defer cache.Close()
	log.Println("Redis connected")

	// Initialize Eporner client
	epornerClient := services.NewEpornerClient(cfg.EpornerBaseURL)

	// Initialize importer
	importer := services.NewImporter(db, cache, epornerClient, cfg.EpornerPerPage)

	// Initialize affiliate service
	affiliateService := services.NewAffiliateService()
	log.Printf("Affiliate service initialized with %d programs", len(affiliateService.GetAllPrograms()))

	// Initialize handlers
	handler := handlers.NewHandler(cfg, db, cache, importer, affiliateService, epornerClient)

	// Create Fiber app
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

	// Setup middleware
	middleware.Setup(app, cfg.FrontendURL)

	// Setup routes
	setupRoutes(app, handler)

	// Setup cron job for auto-import
	var cronScheduler *cron.Cron
	if cfg.ImportEnabled {
		cronScheduler = cron.New()
		_, err = cronScheduler.AddFunc(cfg.ImportSchedule, func() {
			log.Println("Running scheduled import...")
			importer.Run(context.Background())
		})
		if err != nil {
			log.Printf("Warning: Failed to setup import cron: %v", err)
		} else {
			cronScheduler.Start()
			log.Printf("Import cron scheduled: %s", cfg.ImportSchedule)
		}
	}

	// Run startup tasks (initial import or cache refresh)
	go func() {
		time.Sleep(time.Duration(cfg.StartupRefreshDelay) * time.Second)

		count, err := db.GetTotalVideoCount(ctx)
		if err != nil {
			log.Printf("Error checking video count: %v", err)
			return
		}

		if count == 0 {
			log.Println("Database empty, running initial import...")
			importer.Run(ctx)
		} else if cfg.RefreshOnStartup {
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
			// Run light import to get fresh content
			importer.RunLight(ctx)
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

func setupRoutes(app *fiber.App, h *handlers.Handler) {
	// Health check
	app.Get("/health", h.HealthCheck)

	// API routes
	api := app.Group("/api")

	// Public routes
	api.Get("/videos", h.ListVideos)
	api.Get("/search", h.SearchVideos) // Live search via Eporner
	api.Get("/videos/:id", h.GetVideo)
	api.Get("/videos/:id/full", h.GetVideoWithAffiliates)
	api.Get("/videos/:id/related", h.GetRelatedVideos)
	api.Get("/videos/:id/affiliates", h.GetAffiliateLinks)
	api.Get("/categories", h.GetCategories)
	api.Get("/menu-categories", h.GetMenuCategories)
	api.Get("/stats", h.GetStats)

	// Admin routes (in production, add authentication middleware)
	admin := api.Group("/admin")
	admin.Post("/import", h.TriggerImport)
	admin.Get("/import/status", h.GetImportStatus)
}
