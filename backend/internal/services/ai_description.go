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

const (
	openAIResponsesURL = "https://api.openai.com/v1/responses"
	openRouterAPIURL   = "https://openrouter.ai/api/v1/chat/completions"

	aiProviderOpenAI     = "openai"
	aiProviderOpenRouter = "openrouter"
)

// SEOMetadata is the structured result generated for a video page.
type SEOMetadata struct {
	Title           string   `json:"title"`
	MetaDescription string   `json:"meta_description"`
	Description     string   `json:"description"`
	Slug            string   `json:"slug"`
	Tags            []string `json:"tags"`
	Category        string   `json:"category"`
	SafetyNotes     string   `json:"safety_notes"`
	Rejected        bool     `json:"rejected"`
}

// AIDescriptionService generates neutral, cached SEO descriptions for adult catalog pages.
type AIDescriptionService struct {
	apiKey     string
	provider   string
	model      string
	httpClient *http.Client
	enabled    bool
}

type openAIResponsesRequest struct {
	Model           string           `json:"model"`
	Instructions    string           `json:"instructions"`
	Input           string           `json:"input"`
	Text            openAITextConfig `json:"text"`
	Reasoning       *openAIReasoning `json:"reasoning,omitempty"`
	MaxOutputTokens int              `json:"max_output_tokens,omitempty"`
	Store           bool             `json:"store"`
}

type openAIReasoning struct {
	Effort string `json:"effort,omitempty"`
}

type openAITextConfig struct {
	Format    openAITextFormat `json:"format"`
	Verbosity string           `json:"verbosity,omitempty"`
}

type openAITextFormat struct {
	Type   string         `json:"type"`
	Name   string         `json:"name"`
	Strict bool           `json:"strict"`
	Schema map[string]any `json:"schema"`
}

type apiError struct {
	Message string `json:"message"`
	Type    string `json:"type,omitempty"`
	Code    string `json:"code,omitempty"`
}

type openAIResponsesResponse struct {
	OutputText string `json:"output_text,omitempty"`
	Output     []struct {
		Type    string `json:"type"`
		Content []struct {
			Type    string `json:"type"`
			Text    string `json:"text,omitempty"`
			Refusal string `json:"refusal,omitempty"`
		} `json:"content,omitempty"`
	} `json:"output"`
	Error *apiError `json:"error,omitempty"`
}

type openRouterRequest struct {
	Model          string                    `json:"model"`
	Messages       []openRouterMsg           `json:"messages"`
	MaxTokens      int                       `json:"max_tokens"`
	Temperature    float64                   `json:"temperature"`
	ResponseFormat *openRouterResponseFormat `json:"response_format,omitempty"`
}

type openRouterResponseFormat struct {
	Type string `json:"type"`
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
	Error *apiError `json:"error,omitempty"`
}

// NewAIDescriptionService creates a new AI SEO generator.
// OpenAI is preferred when OPENAI_API_KEY is set; OpenRouter remains as a fallback.
func NewAIDescriptionService(openAIAPIKey, openRouterAPIKey, provider, model string) *AIDescriptionService {
	provider = strings.ToLower(strings.TrimSpace(provider))
	openAIAPIKey = strings.TrimSpace(openAIAPIKey)
	openRouterAPIKey = strings.TrimSpace(openRouterAPIKey)

	if provider == "" {
		if openAIAPIKey != "" {
			provider = aiProviderOpenAI
		} else if openRouterAPIKey != "" {
			provider = aiProviderOpenRouter
		}
	}

	apiKey := ""
	switch provider {
	case aiProviderOpenAI:
		apiKey = openAIAPIKey
		if strings.TrimSpace(model) == "" {
			model = "gpt-4o-mini"
		}
	case aiProviderOpenRouter:
		apiKey = openRouterAPIKey
		if strings.TrimSpace(model) == "" {
			model = "meta-llama/llama-3.1-8b-instruct:free"
		}
	default:
		provider = ""
	}

	return &AIDescriptionService{
		apiKey:   apiKey,
		provider: provider,
		model:    strings.TrimSpace(model),
		enabled:  apiKey != "" && provider != "",
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// IsEnabled returns whether the AI service is active.
func (s *AIDescriptionService) IsEnabled() bool {
	return s != nil && s.enabled
}

// Provider returns the configured AI provider name.
func (s *AIDescriptionService) Provider() string {
	if s == nil {
		return ""
	}
	return s.provider
}

// Model returns the configured model name.
func (s *AIDescriptionService) Model() string {
	if s == nil {
		return ""
	}
	return s.model
}

// GenerateDescription creates the stored video description used by imports.
func (s *AIDescriptionService) GenerateDescription(ctx context.Context, title string, categories, tags []string) (string, error) {
	metadata, err := s.GenerateSEOMetadata(ctx, title, categories, tags)
	if err != nil {
		return "", err
	}
	if metadata == nil || metadata.Rejected {
		if metadata != nil && metadata.Rejected {
			log.Printf("AI SEO rejected metadata for %q: %s", title, metadata.SafetyNotes)
		}
		return "", nil
	}
	return metadata.Description, nil
}

// GenerateSEOMetadata creates neutral, factual SEO metadata for an adult BDSM catalog entry.
func (s *AIDescriptionService) GenerateSEOMetadata(ctx context.Context, title string, categories, tags []string) (*SEOMetadata, error) {
	if !s.IsEnabled() {
		return nil, nil
	}

	if term, ok := unsafeSEOInput(title, categories, tags); ok {
		return (&SEOMetadata{
			Title:       neutralTitle(title),
			Slug:        slugify(title),
			Tags:        cleanTags(tags, 8),
			Category:    firstNonEmpty(categories, "bdsm"),
			SafetyNotes: fmt.Sprintf("Input rejected by local safety filter: %s", term),
			Rejected:    true,
		}).normalize(title, categories, tags), nil
	}

	switch s.provider {
	case aiProviderOpenAI:
		return s.generateWithOpenAI(ctx, title, categories, tags)
	case aiProviderOpenRouter:
		return s.generateWithOpenRouter(ctx, title, categories, tags)
	default:
		return nil, fmt.Errorf("ai: unsupported provider %q", s.provider)
	}
}

func (s *AIDescriptionService) generateWithOpenAI(ctx context.Context, title string, categories, tags []string) (*SEOMetadata, error) {
	reqBody := openAIResponsesRequest{
		Model:        s.model,
		Instructions: seoInstructions(),
		Input:        seoInput(title, categories, tags),
		Text: openAITextConfig{
			Format: seoJSONSchemaFormat(),
		},
		MaxOutputTokens: 750,
		Store:           false,
	}

	if strings.HasPrefix(strings.ToLower(s.model), "gpt-5") {
		reqBody.Text.Verbosity = "low"
		reqBody.Reasoning = &openAIReasoning{Effort: "low"}
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("ai: marshal OpenAI request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, openAIResponsesURL, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("ai: create OpenAI request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+s.apiKey)
	req.Header.Set("Content-Type", "application/json")

	respBytes, err := s.do(req)
	if err != nil {
		return nil, err
	}

	var result openAIResponsesResponse
	if err := json.Unmarshal(respBytes, &result); err != nil {
		return nil, fmt.Errorf("ai: parse OpenAI response: %w", err)
	}
	if result.Error != nil {
		return nil, fmt.Errorf("ai: OpenAI error: %s", result.Error.Message)
	}

	rawText, refusal := openAIOutputText(result)
	if refusal != "" {
		return (&SEOMetadata{
			Title:       neutralTitle(title),
			Slug:        slugify(title),
			Tags:        cleanTags(tags, 8),
			Category:    firstNonEmpty(categories, "bdsm"),
			SafetyNotes: refusal,
			Rejected:    true,
		}).normalize(title, categories, tags), nil
	}

	metadata, err := parseSEOMetadata(rawText)
	if err != nil {
		return nil, fmt.Errorf("ai: parse OpenAI SEO JSON: %w", err)
	}
	return metadata.normalize(title, categories, tags), nil
}

func (s *AIDescriptionService) generateWithOpenRouter(ctx context.Context, title string, categories, tags []string) (*SEOMetadata, error) {
	reqBody := openRouterRequest{
		Model: s.model,
		Messages: []openRouterMsg{
			{Role: "system", Content: seoInstructions() + "\nReturn JSON only."},
			{Role: "user", Content: seoInput(title, categories, tags)},
		},
		MaxTokens:      750,
		Temperature:    0.2,
		ResponseFormat: &openRouterResponseFormat{Type: "json_object"},
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("ai: marshal OpenRouter request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, openRouterAPIURL, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("ai: create OpenRouter request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+s.apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("HTTP-Referer", "https://kinktube.com")
	req.Header.Set("X-Title", "KinkTube SEO")

	respBytes, err := s.do(req)
	if err != nil {
		return nil, err
	}

	var result openRouterResponse
	if err := json.Unmarshal(respBytes, &result); err != nil {
		return nil, fmt.Errorf("ai: parse OpenRouter response: %w", err)
	}
	if result.Error != nil {
		return nil, fmt.Errorf("ai: OpenRouter error: %s", result.Error.Message)
	}
	if len(result.Choices) == 0 {
		return nil, fmt.Errorf("ai: no OpenRouter choices returned")
	}

	metadata, err := parseSEOMetadata(result.Choices[0].Message.Content)
	if err != nil {
		return nil, fmt.Errorf("ai: parse OpenRouter SEO JSON: %w", err)
	}
	return metadata.normalize(title, categories, tags), nil
}

func (s *AIDescriptionService) do(req *http.Request) ([]byte, error) {
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("ai: http request: %w", err)
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("ai: read response: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("ai: api returned %d: %s", resp.StatusCode, truncateString(string(respBytes), 700))
	}

	return respBytes, nil
}

func seoInstructions() string {
	return `You generate neutral SEO metadata for a verified 18+ consensual BDSM and fetish video catalog.

Rules:
- Write factual catalog metadata, not explicit erotic prose.
- Assume BDSM terms are consensual adult roleplay only when the metadata supports that interpretation.
- Do not glamorize coercion, abuse, sexual violence, trafficking, minors, incest, bestiality, or illegal acts.
- Avoid graphic anatomical detail and arousal-focused language.
- If the input implies minors, real non-consent, sexual violence, exploitation, trafficking, or illegal content, set rejected to true.
- Keep wording natural, concise, and search-friendly.
- The description should be 70-110 words.
- The meta_description should be 120-155 characters when possible.
- The title should be neutral and should not add claims not present in the input.`
}

func seoInput(title string, categories, tags []string) string {
	return fmt.Sprintf(`Generate JSON SEO metadata for this adult catalog video.

Title: %s
Categories: %s
Tags: %s

Use only the supplied metadata.`, strings.TrimSpace(title), strings.Join(cleanTags(categories, 12), ", "), strings.Join(cleanTags(tags, 20), ", "))
}

func seoJSONSchemaFormat() openAITextFormat {
	return openAITextFormat{
		Type:   "json_schema",
		Name:   "adult_catalog_seo_metadata",
		Strict: true,
		Schema: map[string]any{
			"type":                 "object",
			"additionalProperties": false,
			"properties": map[string]any{
				"title": map[string]any{
					"type":        "string",
					"description": "Neutral SEO title for the video page.",
				},
				"meta_description": map[string]any{
					"type":        "string",
					"description": "Search result meta description in neutral adult catalog language.",
				},
				"description": map[string]any{
					"type":        "string",
					"description": "On-page factual catalog description.",
				},
				"slug": map[string]any{
					"type":        "string",
					"description": "Lowercase URL slug using words from the title and category.",
				},
				"tags": map[string]any{
					"type": "array",
					"items": map[string]any{
						"type": "string",
					},
				},
				"category": map[string]any{
					"type":        "string",
					"description": "Primary catalog category.",
				},
				"safety_notes": map[string]any{
					"type":        "string",
					"description": "Short note explaining rejection, otherwise empty.",
				},
				"rejected": map[string]any{
					"type":        "boolean",
					"description": "True when metadata should not be used.",
				},
			},
			"required": []string{
				"title",
				"meta_description",
				"description",
				"slug",
				"tags",
				"category",
				"safety_notes",
				"rejected",
			},
		},
	}
}

func openAIOutputText(result openAIResponsesResponse) (string, string) {
	if strings.TrimSpace(result.OutputText) != "" {
		return strings.TrimSpace(result.OutputText), ""
	}

	var parts []string
	for _, output := range result.Output {
		for _, content := range output.Content {
			switch content.Type {
			case "output_text":
				if strings.TrimSpace(content.Text) != "" {
					parts = append(parts, content.Text)
				}
			case "refusal":
				if strings.TrimSpace(content.Refusal) != "" {
					return "", strings.TrimSpace(content.Refusal)
				}
			}
		}
	}

	return strings.TrimSpace(strings.Join(parts, "")), ""
}

func parseSEOMetadata(raw string) (*SEOMetadata, error) {
	raw = strings.TrimSpace(raw)
	raw = strings.TrimPrefix(raw, "```json")
	raw = strings.TrimPrefix(raw, "```")
	raw = strings.TrimSuffix(raw, "```")
	raw = strings.TrimSpace(raw)

	if raw == "" {
		return nil, fmt.Errorf("empty metadata response")
	}

	var metadata SEOMetadata
	if err := json.Unmarshal([]byte(raw), &metadata); err != nil {
		return nil, err
	}

	return &metadata, nil
}

func (m *SEOMetadata) normalize(fallbackTitle string, categories, tags []string) *SEOMetadata {
	if m == nil {
		return nil
	}

	m.Title = truncateString(cleanWhitespace(m.Title), 90)
	m.MetaDescription = truncateString(cleanWhitespace(m.MetaDescription), 170)
	m.Description = truncateString(cleanWhitespace(m.Description), 900)
	m.Slug = truncateString(slugify(m.Slug), 96)
	m.Category = cleanTag(m.Category)
	m.SafetyNotes = truncateString(cleanWhitespace(m.SafetyNotes), 240)
	m.Tags = cleanTags(m.Tags, 8)

	if m.Title == "" {
		m.Title = neutralTitle(fallbackTitle)
	}
	if m.Slug == "" {
		m.Slug = slugify(m.Title)
	}
	if m.Category == "" {
		m.Category = firstNonEmpty(categories, "bdsm")
	}
	if len(m.Tags) == 0 {
		m.Tags = cleanTags(tags, 8)
	}
	if m.MetaDescription == "" && m.Description != "" {
		m.MetaDescription = truncateString(m.Description, 155)
	}

	if !m.Rejected && len(m.Description) < 50 {
		m.Rejected = true
		m.SafetyNotes = "Generated description was too short to use."
	}

	return m
}

func unsafeSEOInput(title string, categories, tags []string) (string, bool) {
	text := strings.ToLower(strings.Join(append(append([]string{title}, categories...), tags...), " "))
	normalized := " " + strings.Join(strings.FieldsFunc(text, func(r rune) bool {
		return !(r >= 'a' && r <= 'z') && !(r >= '0' && r <= '9')
	}), " ") + " "

	unsafeTerms := []string{
		"underage",
		"minor",
		"child",
		"children",
		"teen",
		"schoolgirl",
		"schoolboy",
		"lolita",
		"rape",
		"raped",
		"raping",
		"nonconsent",
		"non consensual",
		"non consent",
		"incest",
		"trafficking",
		"trafficked",
		"bestiality",
		"zoophilia",
		"snuff",
	}

	for _, term := range unsafeTerms {
		if strings.Contains(normalized, " "+term+" ") {
			return term, true
		}
	}

	unsafeSubstrings := []string{"nonconsent", "traffick"}
	for _, term := range unsafeSubstrings {
		if strings.Contains(text, term) {
			return term, true
		}
	}

	return "", false
}

func cleanTags(values []string, limit int) []string {
	if limit <= 0 {
		limit = len(values)
	}

	seen := make(map[string]struct{}, len(values))
	cleaned := make([]string, 0, minInt(limit, len(values)))
	for _, value := range values {
		tag := cleanTag(value)
		if tag == "" {
			continue
		}
		if _, ok := seen[tag]; ok {
			continue
		}
		seen[tag] = struct{}{}
		cleaned = append(cleaned, tag)
		if len(cleaned) >= limit {
			break
		}
	}

	return cleaned
}

func cleanTag(value string) string {
	value = strings.ToLower(cleanWhitespace(value))
	value = strings.Trim(value, " #,.;:/\\|")
	return truncateString(value, 48)
}

func cleanWhitespace(value string) string {
	return strings.Join(strings.Fields(strings.TrimSpace(value)), " ")
}

func neutralTitle(title string) string {
	title = cleanWhitespace(title)
	if title == "" {
		return "Adult BDSM Video"
	}
	return truncateString(title, 90)
}

func firstNonEmpty(values []string, fallback string) string {
	for _, value := range values {
		value = cleanTag(value)
		if value != "" {
			return value
		}
	}
	return fallback
}

func slugify(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	var builder strings.Builder
	lastDash := false
	for _, r := range value {
		isAlphaNum := (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9')
		if isAlphaNum {
			builder.WriteRune(r)
			lastDash = false
			continue
		}
		if !lastDash && builder.Len() > 0 {
			builder.WriteByte('-')
			lastDash = true
		}
	}

	return strings.Trim(builder.String(), "-")
}

func truncateString(value string, maxRunes int) string {
	if maxRunes <= 0 {
		return ""
	}
	runes := []rune(strings.TrimSpace(value))
	if len(runes) <= maxRunes {
		return string(runes)
	}
	return strings.TrimSpace(string(runes[:maxRunes]))
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}
