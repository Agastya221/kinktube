package handlers

import (
	"crypto/subtle"
	"strings"

	"github.com/gofiber/fiber/v2"
)

// RequireAdminAuth protects admin endpoints with a configured API key.
func (h *Handler) RequireAdminAuth(c *fiber.Ctx) error {
	adminAPIKey := strings.TrimSpace(h.config.AdminAPIKey)
	if adminAPIKey == "" {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error":   "Admin API disabled",
			"message": "Set ADMIN_API_KEY to enable admin endpoints",
		})
	}

	providedKey := strings.TrimSpace(c.Get("X-Admin-Key"))
	if providedKey == "" {
		authHeader := strings.TrimSpace(c.Get("Authorization"))
		if strings.HasPrefix(strings.ToLower(authHeader), "bearer ") {
			providedKey = strings.TrimSpace(authHeader[7:])
		}
	}

	if subtle.ConstantTimeCompare([]byte(providedKey), []byte(adminAPIKey)) != 1 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":   "Unauthorized",
			"message": "Valid admin credentials are required",
		})
	}

	return c.Next()
}
