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
		
		// List all videos to re-check
		page := 1
		pageSize := 50
		hiddenCount := 0
		
		for {
			videos, err := h.db.ListVideosForValidation(ctx, page, pageSize)
			if err != nil || len(videos) == 0 {
				break
			}
			
			for _, v := range videos {
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
			
			page++
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
