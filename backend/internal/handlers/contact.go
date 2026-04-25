package handlers

import (
	"encoding/json"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"

	"kinktube/internal/models"
)

type updateContactSubmissionStatusRequest struct {
	Status string `json:"status"`
}

func (h *Handler) CreateContactSubmission(c *fiber.Ctx) error {
	var req models.ContactSubmissionRequest
	if err := json.Unmarshal(c.Body(), &req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request payload",
		})
	}

	models.NormalizeContactSubmissionRequest(&req)

	if req.Website != "" {
		return c.JSON(fiber.Map{"ok": true})
	}

	if strings.TrimSpace(req.Subject) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Subject is required",
		})
	}
	if strings.TrimSpace(req.Message) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Message is required",
		})
	}

	submission := &models.ContactSubmission{
		Type:      req.Type,
		Name:      req.Name,
		ReplyTo:   req.ReplyTo,
		PageURL:   req.PageURL,
		SourceURL: req.SourceURL,
		Subject:   req.Subject,
		Message:   req.Message,
		IPAddress: c.IP(),
		UserAgent: reqUserAgent(c),
	}

	if err := h.db.CreateContactSubmission(c.Context(), submission); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to save message",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"ok":      true,
		"message": "Message saved.",
	})
}

func (h *Handler) ListAdminContactSubmissions(c *fiber.Ctx) error {
	limit, _ := strconv.Atoi(c.Query("limit", "100"))
	messages, err := h.db.ListContactSubmissions(c.Context(), limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to load messages",
		})
	}

	return c.JSON(models.ContactSubmissionsResponse{Messages: messages})
}

func (h *Handler) UpdateAdminContactSubmissionStatus(c *fiber.Ctx) error {
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil || id < 1 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid message ID",
		})
	}

	var req updateContactSubmissionStatusRequest
	if err := json.Unmarshal(c.Body(), &req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request payload",
		})
	}

	message, err := h.db.UpdateContactSubmissionStatus(c.Context(), id, req.Status)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update message",
		})
	}

	return c.JSON(fiber.Map{
		"ok":      true,
		"message": message,
	})
}

func reqUserAgent(c *fiber.Ctx) string {
	userAgent := strings.TrimSpace(c.Get(fiber.HeaderUserAgent))
	if len(userAgent) > 500 {
		return userAgent[:500]
	}
	return userAgent
}
