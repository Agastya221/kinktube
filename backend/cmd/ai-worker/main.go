package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"

	"kinktube/internal/config"
	"kinktube/internal/database"
	"kinktube/internal/services"
)

func main() {
	_ = godotenv.Load(".env.worker", "../.env.worker", "../../.env.worker", ".env")

	cfg := config.Load()
	if cfg.AIProvider == "" {
		cfg.AIProvider = "ollama"
	}
	if cfg.AIModel == "" {
		cfg.AIModel = "dolphin3"
	}

	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()

	log.Println("KinkTube AI worker starting")
	log.Printf("AI provider: %s, model: %s", cfg.AIProvider, cfg.AIModel)

	log.Println("Connecting to PostgreSQL...")
	db, err := database.NewPostgresDB(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to PostgreSQL: %v", err)
	}
	defer db.Close()

	if err := db.InitSchema(ctx); err != nil {
		log.Fatalf("Failed to initialize database schema: %v", err)
	}

	aiService := services.NewAIDescriptionService(
		cfg.OpenAIAPIKey,
		cfg.OpenRouterAPIKey,
		cfg.OllamaBaseURL,
		cfg.AIProvider,
		cfg.AIModel,
	)
	if !aiService.IsEnabled() {
		log.Fatal("AI SEO service is disabled. Set AI_PROVIDER=ollama and OLLAMA_BASE_URL=http://localhost:11434")
	}

	importer := services.NewImporter(
		db,
		nil,
		services.NewEpornerClient(cfg.EpornerBaseURL),
		aiService,
		cfg.EpornerPerPage,
		cfg.ImportMaxPages,
		cfg.LightImportMaxPages,
		cfg.LightImportKeywords,
		cfg.AISEODailyTokenBudget,
	)

	batchSize := cfg.AISEOBackfillBatchSize
	if batchSize < 1 {
		batchSize = 1
	}
	delay := time.Duration(cfg.AISEOBackfillDelayMS) * time.Millisecond
	if delay < 0 {
		delay = 0
	}

	log.Printf("Backfill started: batch_size=%d delay=%s", batchSize, delay)
	log.Println("Press Ctrl+C to stop safely.")

	importer.BackfillWithBudgetWait(ctx, batchSize, delay)

	log.Println("KinkTube AI worker stopped")
}
