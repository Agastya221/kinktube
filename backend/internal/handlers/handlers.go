package handlers

import (
	"sync"

	"kinktube/internal/config"
	"kinktube/internal/database"
	"kinktube/internal/models"
	"kinktube/internal/services"
)

// Handler holds all dependencies for HTTP handlers
type Handler struct {
	config    *config.Config
	db        *database.PostgresDB
	cache     *database.RedisCache
	importer  *services.Importer
	affiliate *services.AffiliateService
	eporner   *services.EpornerClient
	ai        *services.AIDescriptionService

	siteSettingsMu sync.RWMutex
	siteSettings   *models.SiteSettings
}

// NewHandler creates a new handler with dependencies
func NewHandler(cfg *config.Config, db *database.PostgresDB, cache *database.RedisCache, importer *services.Importer, affiliate *services.AffiliateService, eporner *services.EpornerClient, ai *services.AIDescriptionService, initialSettings *models.SiteSettings) *Handler {
	return &Handler{
		config:       cfg,
		db:           db,
		cache:        cache,
		importer:     importer,
		affiliate:    affiliate,
		eporner:      eporner,
		ai:           ai,
		siteSettings: initialSettings,
	}
}
