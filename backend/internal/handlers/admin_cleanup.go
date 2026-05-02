package handlers

import (
	"context"
	"log"
	"time"

	"github.com/gofiber/fiber/v2"

	"kinktube/internal/database"
	"kinktube/internal/services"
)

// TriggerDBCleanup runs the full filter over the DB and marks bad videos unavailable
func (h *Handler) TriggerDBCleanup(c *fiber.Ctx) error {
	go func() {
		ctx := context.Background()
		log.Println("Starting manual DB cleanup based on new BDSM filters...")
		
		// Use keyset pagination (afterID) to avoid skip bugs
		var lastSeenID int64
		batchSize := 50
		hiddenCount := 0
		
		for {
			videos, err := h.db.ListVideosForValidation(ctx, lastSeenID, batchSize)
			if err != nil || len(videos) == 0 {
				break
			}
			
			for _, v := range videos {
				lastSeenID = v.ID

				// To do this properly we need to fetch the full video to get title/keywords
				fullVid, err := h.db.GetVideoByID(ctx, v.ID)
				if err != nil || fullVid == nil {
					continue
				}
				
				// Re-run the filter
				ev := &services.EpornerVideo{
					Title:    fullVid.Title,
					Keywords: fullVid.Keywords,
				}
				
				if !services.IsRelevantBDSMVideo(ev) {
					// Hide it
					_ = h.db.MarkVideoUnavailable(ctx, fullVid.ID)
					// Remove from cache
					_ = h.cache.Delete(ctx, database.VideoCacheKey(fullVid.ID))
					_ = h.cache.Delete(ctx, database.VideoExternalCacheKey(fullVid.ExternalID))
					hiddenCount++
					log.Printf("Cleaned up legacy vanilla video: [%d] %s", fullVid.ID, fullVid.Title)
				}
			}
			
			if len(videos) < batchSize {
				break
			}
			time.Sleep(50 * time.Millisecond) // avoid hammering db
		}
		
		if hiddenCount > 0 {
			h.invalidateBrowseCaches(ctx)
		}
		log.Printf("DB Cleanup complete. Hidden %d legacy vanilla videos.", hiddenCount)
	}()

	return c.JSON(fiber.Map{
		"message": "DB cleanup started in background",
		"status":  "running",
	})
}

// GetDeadVideoCleanupStatus returns the current state of the dead-video cleanup.
func (h *Handler) GetDeadVideoCleanupStatus(c *fiber.Ctx) error {
	running := h.importer.IsCleanupRunning()
	startedAt := h.importer.CleanupStartedAt()

	resp := fiber.Map{
		"running": running,
	}
	if !startedAt.IsZero() {
		resp["started_at"] = startedAt.UTC().Format(time.RFC3339)
		if running {
			resp["elapsed"] = time.Since(startedAt).Round(time.Second).String()
		}
	}

	return c.JSON(resp)
}

// StartDeadVideoCleanup starts the dead-video cleanup via admin request.
func (h *Handler) StartDeadVideoCleanup(c *fiber.Ctx) error {
	if err := h.importer.StartDeadVideoCleanup(); err != nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"ok":      false,
			"message": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"ok":      true,
		"message": "Dead video cleanup started (auto-stops after 2 hours)",
	})
}

// StopDeadVideoCleanup stops the dead-video cleanup via admin request.
func (h *Handler) StopDeadVideoCleanup(c *fiber.Ctx) error {
	h.importer.StopDeadVideoCleanup()

	return c.JSON(fiber.Map{
		"ok":      true,
		"message": "Dead video cleanup stopped",
	})
}
