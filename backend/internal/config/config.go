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
	RedisURL string

	// Eporner API
	EpornerBaseURL string
	EpornerPerPage int

	// Import settings
	ImportEnabled  bool
	ImportSchedule string // Cron expression

	// Cache TTL in seconds
	CacheTTL int

	// Frontend URL for CORS
	FrontendURL string
}

// Load reads configuration from environment variables
func Load() *Config {
	perPage, _ := strconv.Atoi(getEnv("EPORNER_PER_PAGE", "100"))
	cacheTTL, _ := strconv.Atoi(getEnv("CACHE_TTL", "300"))
	importEnabled, _ := strconv.ParseBool(getEnv("IMPORT_ENABLED", "true"))

	return &Config{
		ServerPort:     getEnv("SERVER_PORT", "8080"),
		ServerHost:     getEnv("SERVER_HOST", "0.0.0.0"),
		DatabaseURL:    getEnv("DATABASE_URL", "postgres://kinktube:kinktube@localhost:5432/kinktube?sslmode=disable"),
		RedisURL:       getEnv("REDIS_URL", "redis://localhost:6379"),
		EpornerBaseURL: getEnv("EPORNER_BASE_URL", "https://www.eporner.com/api/v2"),
		EpornerPerPage: perPage,
		ImportEnabled:  importEnabled,
		ImportSchedule: getEnv("IMPORT_SCHEDULE", "0 */6 * * *"), // Every 6 hours by default
		CacheTTL:       cacheTTL,
		FrontendURL:    getEnv("FRONTEND_URL", "http://localhost:3000"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
