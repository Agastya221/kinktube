package middleware

import (
	"log"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/gofiber/fiber/v2/middleware/recover"
)

// Setup configures all middleware for the Fiber app
func Setup(app *fiber.App, frontendURL string) {
	// Recover from panics
	app.Use(recover.New(recover.Config{
		EnableStackTrace: true,
	}))

	// CORS configuration
	app.Use(cors.New(cors.Config{
		AllowOrigins:     frontendURL,
		AllowMethods:     "GET,POST,HEAD,OPTIONS",
		AllowHeaders:     "Origin,Content-Type,Accept,Authorization",
		AllowCredentials: false,
		MaxAge:           3600,
	}))

	// Request logging
	app.Use(requestLogger())

	// Rate limiting - 100 requests per minute per IP
	app.Use(limiter.New(limiter.Config{
		Max:               100,
		Expiration:        1 * time.Minute,
		LimiterMiddleware: limiter.SlidingWindow{},
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error":   "Too many requests",
				"message": "Please slow down your requests",
			})
		},
	}))
}

// requestLogger logs incoming requests
func requestLogger() fiber.Handler {
	return func(c *fiber.Ctx) error {
		start := time.Now()

		// Process request
		err := c.Next()

		// Log request details
		log.Printf("%s %s %d %v",
			c.Method(),
			c.Path(),
			c.Response().StatusCode(),
			time.Since(start),
		)

		return err
	}
}

// CacheControl sets cache headers for responses
func CacheControl(maxAge int) fiber.Handler {
	return func(c *fiber.Ctx) error {
		c.Set("Cache-Control", "public, max-age="+string(rune(maxAge)))
		return c.Next()
	}
}
