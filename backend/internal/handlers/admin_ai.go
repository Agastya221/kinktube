package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"

	"kinktube/internal/database"
	"kinktube/internal/models"
	"kinktube/internal/services"
)

type adminSEOGenerateRequest struct {
	VideoID    string   `json:"video_id"`
	Title      string   `json:"title"`
	Categories []string `json:"categories"`
	Tags       []string `json:"tags"`
	Save       bool     `json:"save"`
}

type adminSEOGenerateResponse struct {
	OK       bool                  `json:"ok"`
	Provider string                `json:"provider"`
	Model    string                `json:"model"`
	SEO      *services.SEOMetadata `json:"seo"`
	Saved    bool                  `json:"saved"`
	Video    *models.Video         `json:"video,omitempty"`
}

// GenerateAdminSEO handles POST /api/admin/seo/generate for testing/saving AI SEO text.
func (h *Handler) GenerateAdminSEO(c *fiber.Ctx) error {
	if h.ai == nil || !h.ai.IsEnabled() {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error":   "AI SEO is disabled",
			"message": "Set OPENAI_API_KEY or OPENROUTER_API_KEY to enable AI SEO generation",
		})
	}

	var req adminSEOGenerateRequest
	if len(c.Body()) > 0 {
		if err := json.Unmarshal(c.Body(), &req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid request payload",
			})
		}
	}

	var video *models.Video
	if strings.TrimSpace(req.VideoID) != "" {
		resolved, err := h.resolveVideoIdentifier(c.Context(), req.VideoID)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to load video",
			})
		}
		if resolved == nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Video not found",
			})
		}
		video = resolved
	}

	title := strings.TrimSpace(req.Title)
	categories := cleanRequestList(req.Categories)
	tags := cleanRequestList(req.Tags)

	if video != nil {
		if title == "" {
			title = video.Title
		}
		if len(categories) == 0 {
			categories = video.Categories
		}
		if len(tags) == 0 {
			tags = video.Tags
		}
	}

	if title == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Title is required when no video id is provided",
		})
	}

	seo, err := h.ai.GenerateSEOMetadata(c.Context(), title, categories, tags)
	if err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
			"error":   "AI SEO generation failed",
			"message": err.Error(),
		})
	}
	if seo == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error": "AI SEO returned no result",
		})
	}

	saved := false
	if req.Save {
		if video == nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "A video id is required to save generated SEO text",
			})
		}
		if seo.Rejected {
			return c.JSON(adminSEOGenerateResponse{
				OK:       false,
				Provider: h.ai.Provider(),
				Model:    h.ai.Model(),
				SEO:      seo,
				Saved:    false,
				Video:    video,
			})
		}

		if err := h.db.UpdateVideoDescription(c.Context(), video.ID, seo.Description); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to save generated description",
			})
		}

		video.Description = seo.Description
		_ = h.cache.Delete(c.Context(), database.VideoCacheKey(video.ID))
		_ = h.cache.Delete(c.Context(), database.VideoExternalCacheKey(video.ExternalID))
		h.cacheVideoRecord(c.Context(), video)
		h.invalidateBrowseCaches(c.Context())
		saved = true
	}

	return c.JSON(adminSEOGenerateResponse{
		OK:       !seo.Rejected,
		Provider: h.ai.Provider(),
		Model:    h.ai.Model(),
		SEO:      seo,
		Saved:    saved,
		Video:    video,
	})
}

func cleanRequestList(values []string) []string {
	cleaned := make([]string, 0, len(values))
	seen := make(map[string]struct{}, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		cleaned = append(cleaned, value)
	}
	return cleaned
}

// StartAdminSEOBackfill handles POST /api/admin/seo/backfill/start
func (h *Handler) StartAdminSEOBackfill(c *fiber.Ctx) error {
	if h.ai == nil || !h.ai.IsEnabled() {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error":   "AI SEO is disabled",
			"message": "Set OPENAI_API_KEY or OPENROUTER_API_KEY to enable AI SEO generation",
		})
	}

	if err := h.importer.StartSEOBackfill(
		context.Background(),
		h.config.AISEOBackfillBatchSize,
		time.Duration(h.config.AISEOBackfillDelayMS)*time.Millisecond,
	); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Failed to start AI SEO backfill",
			"message": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"ok":      true,
		"message": "AI SEO backfill started",
	})
}

// StopAdminSEOBackfill handles POST /api/admin/seo/backfill/stop
func (h *Handler) StopAdminSEOBackfill(c *fiber.Ctx) error {
	if err := h.importer.StopSEOBackfill(); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Failed to stop AI SEO backfill",
			"message": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"ok":      true,
		"message": "AI SEO backfill stopped",
	})
}

// ResetAdminSEOBackfill handles POST /api/admin/seo/backfill/reset
func (h *Handler) ResetAdminSEOBackfill(c *fiber.Ctx) error {
	type Request struct {
		Timeframe string `json:"timeframe"` // "today" or "all"
	}
	var req Request
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	all := req.Timeframe == "all"

	// Ensure we stop backfill before resetting
	_ = h.importer.StopSEOBackfill()

	count, err := h.db.ResetAISEO(c.Context(), all)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to reset AI SEO data",
			"message": err.Error(),
		})
	}

	h.importer.ResetDailyTokenUsage()

	return c.JSON(fiber.Map{
		"ok":      true,
		"message": fmt.Sprintf("Reset AI SEO: reverted %d videos and cleared logs", count),
		"count":   count,
	})
}
