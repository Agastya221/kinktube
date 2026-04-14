package handlers

import (
	"kinktube/internal/config"
	"kinktube/internal/database"
	"kinktube/internal/services"
)

// Handler holds all dependencies for HTTP handlers
type Handler struct {
	config    *config.Config
	db        *database.PostgresDB
	cache     *database.RedisCache
	importer  *services.Importer
	affiliate *services.AffiliateService
}

// NewHandler creates a new handler with dependencies
func NewHandler(cfg *config.Config, db *database.PostgresDB, cache *database.RedisCache, importer *services.Importer, affiliate *services.AffiliateService) *Handler {
	return &Handler{
		config:    cfg,
		db:        db,
		cache:     cache,
		importer:  importer,
		affiliate: affiliate,
	}
}
