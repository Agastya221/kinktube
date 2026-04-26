package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"
)

const openRouterAPIURL = "https://openrouter.ai/api/v1/chat/completions"

// AIDescriptionService generates unique SEO descriptions via OpenRouter
type AIDescriptionService struct {
	apiKey     string
	model      string
	httpClient *http.Client
	enabled    bool
}

type openRouterRequest struct {
	Model    string            `json:"model"`
	Messages []openRouterMsg   `json:"messages"`
	MaxTokens int              `json:"max_tokens"`
}

type openRouterMsg struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type openRouterResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

// NewAIDescriptionService creates a new AI description generator.
// If apiKey is empty, the service is disabled and returns empty strings.
func NewAIDescriptionService(apiKey, model string) *AIDescriptionService {
	if model == "" {
		model = "meta-llama/llama-3.1-8b-instruct:free"
	}
	return &AIDescriptionService{
		apiKey:  apiKey,
		model:   model,
		enabled: apiKey != "",
		httpClient: &http.Client{
			Timeout: 20 * time.Second,
		},
	}
}

// IsEnabled returns whether the AI service is active
func (s *AIDescriptionService) IsEnabled() bool {
	return s.enabled
}

// GenerateDescription creates a unique, SEO-optimised description for a BDSM video.
// It uses the video title, categories and tags as context for the AI.
func (s *AIDescriptionService) GenerateDescription(ctx context.Context, title string, categories, tags []string) (string, error) {
	if !s.enabled {
		return "", nil
	}

	// Build a context string from categories and tags (cap at 20 tags to keep prompt short)
	allTags := append(categories, tags...)
	if len(allTags) > 20 {
		allTags = allTags[:20]
	}
	tagStr := strings.Join(allTags, ", ")

	prompt := fmt.Sprintf(`You are an adult content SEO copywriter. Write a 150-200 word description for a fetish/BDSM video.

Video title: %s
Keywords/tags: %s

Rules:
- Write in third person, present tense
- Naturally weave the fetish terms from the tags into the description
- Do NOT use the phrases "delve", "explore", "journey", or "embark"
- Do NOT start with "In this video" or "Watch as"
- Sound like a human wrote it, not an AI
- Do NOT include any legal disclaimers or age statements
- Output ONLY the description text, no extra commentary

Description:`, title, tagStr)

	reqBody := openRouterRequest{
		Model: s.model,
		Messages: []openRouterMsg{
			{Role: "user", Content: prompt},
		},
		MaxTokens: 280,
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("ai: marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, openRouterAPIURL, bytes.NewReader(bodyBytes))
	if err != nil {
		return "", fmt.Errorf("ai: create request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+s.apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("HTTP-Referer", "https://kinktube.com")
	req.Header.Set("X-Title", "KinkTube SEO")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("ai: http request: %w", err)
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("ai: read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("ai: api returned %d: %s", resp.StatusCode, string(respBytes))
	}

	var result openRouterResponse
	if err := json.Unmarshal(respBytes, &result); err != nil {
		return "", fmt.Errorf("ai: parse response: %w", err)
	}

	if result.Error != nil {
		return "", fmt.Errorf("ai: api error: %s", result.Error.Message)
	}

	if len(result.Choices) == 0 {
		return "", fmt.Errorf("ai: no choices returned")
	}

	description := strings.TrimSpace(result.Choices[0].Message.Content)

	// Sanity-check: reject if too short or looks like a refusal
	if len(description) < 50 {
		log.Printf("AI description too short (%d chars), skipping", len(description))
		return "", nil
	}
	refusalPhrases := []string{"I cannot", "I'm unable", "I can't", "I apologize", "not appropriate"}
	for _, phrase := range refusalPhrases {
		if strings.Contains(description, phrase) {
			log.Printf("AI refused to generate description for: %s", title)
			return "", nil
		}
	}

	return description, nil
}
