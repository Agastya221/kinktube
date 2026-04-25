package models

import (
	"strings"
	"time"
)

type ContactSubmission struct {
	ID        int64     `json:"id"`
	Type      string    `json:"type"`
	Name      string    `json:"name,omitempty"`
	ReplyTo   string    `json:"reply_to,omitempty"`
	PageURL   string    `json:"page_url,omitempty"`
	SourceURL string    `json:"source_url,omitempty"`
	Subject   string    `json:"subject"`
	Message   string    `json:"message"`
	Status    string    `json:"status"`
	IPAddress string    `json:"ip_address,omitempty"`
	UserAgent string    `json:"user_agent,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type ContactSubmissionRequest struct {
	Type      string `json:"type"`
	Name      string `json:"name"`
	ReplyTo   string `json:"reply_to"`
	PageURL   string `json:"page_url"`
	SourceURL string `json:"source_url"`
	Subject   string `json:"subject"`
	Message   string `json:"message"`
	Website   string `json:"website"`
}

type ContactSubmissionsResponse struct {
	Messages []ContactSubmission `json:"messages"`
}

func NormalizeContactSubmissionRequest(req *ContactSubmissionRequest) {
	req.Type = normalizeContactType(req.Type)
	req.Name = trimMax(req.Name, 120)
	req.ReplyTo = trimMax(req.ReplyTo, 200)
	req.PageURL = trimMax(req.PageURL, 500)
	req.SourceURL = trimMax(req.SourceURL, 500)
	req.Subject = trimMax(req.Subject, 160)
	req.Message = trimMax(req.Message, 5000)
	req.Website = trimMax(req.Website, 500)
}

func normalizeContactType(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "content_removal", "dmca", "privacy", "general":
		return strings.ToLower(strings.TrimSpace(value))
	default:
		return "content_removal"
	}
}

func trimMax(value string, limit int) string {
	value = strings.TrimSpace(value)
	if len(value) <= limit {
		return value
	}
	return value[:limit]
}
