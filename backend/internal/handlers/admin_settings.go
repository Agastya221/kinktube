package handlers

import (
	"context"
	"encoding/json"

	"github.com/gofiber/fiber/v2"

	"kinktube/internal/models"
)

func (h *Handler) GetPublicSiteSettings(c *fiber.Ctx) error {
	settings, err := h.getSiteSettings(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to load site settings",
		})
	}

	c.Set(fiber.HeaderCacheControl, "no-store")
	return c.JSON(settings.Public())
}

func (h *Handler) GetAdminSettings(c *fiber.Ctx) error {
	settings, err := h.getSiteSettings(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to load admin settings",
		})
	}

	return c.JSON(settings)
}

func (h *Handler) UpdateAdminSettings(c *fiber.Ctx) error {
	settings := h.defaultSiteSettings()
	if err := json.Unmarshal(c.Body(), settings); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid settings payload",
		})
	}

	models.NormalizeSiteSettings(settings)

	if err := h.db.SaveSiteSettings(c.Context(), settings); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to save admin settings",
		})
	}

	h.applySiteSettings(settings)

	return c.JSON(fiber.Map{
		"ok":       true,
		"settings": settings,
	})
}

func (h *Handler) TriggerLightImport(c *fiber.Ctx) error {
	if h.importer.IsRunning() {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error":   "Import already in progress",
			"message": "Please wait for the current import to complete",
		})
	}

	go h.importer.RunLight(context.Background())

	return c.JSON(fiber.Map{
		"message": "Light import started",
		"status":  "running",
	})
}
