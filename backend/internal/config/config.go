package config

import (
	"os"
	"strconv"
)

// Config holds all application configuration
type Config struct {
	// Server
	ServerPort string
	ServerHost string

	// Database
	DatabaseURL string

	// Redis
	RedisURL          string
	RedisPoolSize     int
	RedisMinIdleConns int

	// Eporner API
	EpornerBaseURL string
	EpornerPerPage int

	// Import settings
	ImportEnabled       bool
	ImportSchedule      string // Cron expression
	RefreshOnStartup    bool   // Whether to refresh cache/content on startup
	StartupRefreshDelay int    // Seconds to wait before startup refresh
	ImportMaxPages      int
	LightImportMaxPages int
	LightImportKeywords int

	// Cache TTL in seconds
	CacheTTL int

	// Frontend URL for CORS
	FrontendURL string

	// Admin API key for protected endpoints
	AdminAPIKey       string
	AdminUsername     string
	AdminPassword     string
	AdminPasswordHash string
	SiteURL           string
}

// Load reads configuration from environment variables
func Load() *Config {
	perPage, _ := strconv.Atoi(getEnv("EPORNER_PER_PAGE", "100"))
	cacheTTL, _ := strconv.Atoi(getEnv("CACHE_TTL", "300"))
	redisPoolSize, _ := strconv.Atoi(getEnv("REDIS_POOL_SIZE", "10"))
	redisMinIdleConns, _ := strconv.Atoi(getEnv("REDIS_MIN_IDLE_CONNS", "1"))
	importEnabled, _ := strconv.ParseBool(getEnv("IMPORT_ENABLED", "true"))
	refreshOnStartup, _ := strconv.ParseBool(getEnv("REFRESH_ON_STARTUP", "false"))
	startupDelay, _ := strconv.Atoi(getEnv("STARTUP_REFRESH_DELAY", "10"))
	importMaxPages, _ := strconv.Atoi(getEnv("IMPORT_MAX_PAGES", "8"))
	lightImportMaxPages, _ := strconv.Atoi(getEnv("LIGHT_IMPORT_MAX_PAGES", "2"))
	lightImportKeywords, _ := strconv.Atoi(getEnv("LIGHT_IMPORT_KEYWORDS", "40"))

	return &Config{
		ServerPort:          getEnv("SERVER_PORT", "8080"),
		ServerHost:          getEnv("SERVER_HOST", "0.0.0.0"),
		DatabaseURL:         getEnv("DATABASE_URL", "postgres://kinktube:kinktube@localhost:5432/kinktube?sslmode=disable"),
		RedisURL:            getEnv("REDIS_URL", "redis://localhost:6379"),
		RedisPoolSize:       redisPoolSize,
		RedisMinIdleConns:   redisMinIdleConns,
		EpornerBaseURL:      getEnv("EPORNER_BASE_URL", "https://www.eporner.com/api/v2"),
		EpornerPerPage:      perPage,
		ImportEnabled:       importEnabled,
		ImportSchedule:      getEnv("IMPORT_SCHEDULE", "0 */6 * * *"), // Every 6 hours by default
		RefreshOnStartup:    refreshOnStartup,
		StartupRefreshDelay: startupDelay,
		ImportMaxPages:      importMaxPages,
		LightImportMaxPages: lightImportMaxPages,
		LightImportKeywords: lightImportKeywords,
		CacheTTL:            cacheTTL,
		FrontendURL:         getEnv("FRONTEND_URL", "http://localhost:3000"),
		AdminAPIKey:         getEnv("ADMIN_API_KEY", ""),
		AdminUsername:       getEnv("ADMIN_USERNAME", "admin"),
		AdminPassword:       getEnv("ADMIN_PASSWORD", ""),
		AdminPasswordHash:   getEnv("ADMIN_PASSWORD_HASH", ""),
		SiteURL:             getEnv("SITE_URL", "https://yourdomain.com"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
