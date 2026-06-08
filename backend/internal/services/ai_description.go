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
	defaultOllamaURL   = "http://localhost:11434"

	aiProviderOpenAI     = "openai"
	aiProviderOpenRouter = "openrouter"
	aiProviderOllama     = "ollama"
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

// AIDescriptionService generates cached SEO descriptions for adult catalog pages.
// It supports an automatic fallback: if the primary provider (OpenAI) rejects content,
// it retries with the fallback provider (OpenRouter uncensored model).
type AIDescriptionService struct {
	apiKey     string
	provider   string
	model      string
	ollamaURL  string
	httpClient *http.Client
	enabled    bool

	// Fallback provider for rejected content
	fallbackAPIKey  string
	fallbackModel   string
	fallbackEnabled bool
}

type openAIResponsesRequest struct {
	Model           string           `json:"model"`
	Instructions    string           `json:"instructions"`
	Input           string           `json:"input"`
	Text            openAITextConfig `json:"text"`
	Reasoning       *openAIReasoning `json:"reasoning,omitempty"`
	Temperature     *float64         `json:"temperature,omitempty"`
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

type ollamaChatRequest struct {
	Model    string          `json:"model"`
	Messages []openRouterMsg `json:"messages"`
	Stream   bool            `json:"stream"`
	Format   string          `json:"format,omitempty"`
	Options  map[string]any  `json:"options,omitempty"`
}

type ollamaChatResponse struct {
	Message openRouterMsg `json:"message"`
	Error   string        `json:"error,omitempty"`
}

// NewAIDescriptionService creates a new AI SEO generator.
// OpenAI is the primary provider. If OpenAI rejects content, it falls back to
// OpenRouter with an uncensored model to handle false-positive rejections.
func NewAIDescriptionService(openAIAPIKey, openRouterAPIKey, ollamaBaseURL, provider, model string) *AIDescriptionService {
	provider = strings.ToLower(strings.TrimSpace(provider))
	openAIAPIKey = strings.TrimSpace(openAIAPIKey)
	openRouterAPIKey = strings.TrimSpace(openRouterAPIKey)
	ollamaBaseURL = strings.TrimSpace(ollamaBaseURL)
	if ollamaBaseURL == "" {
		ollamaBaseURL = defaultOllamaURL
	}

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
			model = "cognitivecomputations/dolphin-mistral-24b-venice-edition:free"
		}
	case aiProviderOllama:
		if strings.TrimSpace(model) == "" {
			model = "dolphin3"
		}
	default:
		provider = ""
	}

	// Set up fallback: if primary is OpenAI and OpenRouter key is also available,
	// use OpenRouter as the fallback for rejected content.
	fallbackKey := ""
	fallbackModel := "cognitivecomputations/dolphin-mistral-24b-venice-edition:free"
	if provider == aiProviderOpenAI && openRouterAPIKey != "" {
		fallbackKey = openRouterAPIKey
		log.Println("AI SEO: OpenAI primary → OpenRouter fallback for rejected content")
	}

	return &AIDescriptionService{
		apiKey:          apiKey,
		provider:        provider,
		model:           strings.TrimSpace(model),
		ollamaURL:       strings.TrimRight(ollamaBaseURL, "/"),
		enabled:         provider == aiProviderOllama || (apiKey != "" && provider != ""),
		fallbackAPIKey:  fallbackKey,
		fallbackModel:   fallbackModel,
		fallbackEnabled: fallbackKey != "",
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

// GenerateSEOMetadata creates clickable, factual SEO metadata for an adult BDSM catalog entry.
// If the primary provider rejects the content and a fallback is configured, it automatically
// retries with the uncensored fallback model.
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

	var metadata *SEOMetadata
	var err error

	switch s.provider {
	case aiProviderOpenAI:
		metadata, err = s.generateWithOpenAI(ctx, title, categories, tags)
	case aiProviderOpenRouter:
		metadata, err = s.generateWithOpenRouter(ctx, title, categories, tags)
	case aiProviderOllama:
		metadata, err = s.generateWithOllama(ctx, title, categories, tags)
	default:
		return nil, fmt.Errorf("ai: unsupported provider %q", s.provider)
	}

	if err != nil {
		return metadata, err
	}

	// If primary provider rejected the content AND we have a fallback configured,
	// retry with the uncensored model.
	if metadata != nil && metadata.Rejected && s.fallbackEnabled {
		log.Printf("AI SEO: primary rejected %q (%s), retrying with fallback model %s",
			title, metadata.SafetyNotes, s.fallbackModel)
		fallbackMeta, fallbackErr := s.generateWithFallback(ctx, title, categories, tags)
		if fallbackErr != nil {
			log.Printf("AI SEO: fallback also failed for %q: %v", title, fallbackErr)
			// Return the original rejection — fallback failed
			return metadata, nil
		}
		if fallbackMeta != nil && !fallbackMeta.Rejected && fallbackMeta.Description != "" {
			log.Printf("AI SEO: fallback SUCCEEDED for %q via %s", title, s.fallbackModel)
			return fallbackMeta, nil
		}
		// Fallback also rejected — return original
		log.Printf("AI SEO: fallback also rejected %q", title)
	}

	return metadata, nil
}

func (s *AIDescriptionService) generateWithOpenAI(ctx context.Context, title string, categories, tags []string) (*SEOMetadata, error) {
	modelName := strings.ToLower(s.model)
	reqBody := openAIResponsesRequest{
		Model:        s.model,
		Instructions: seoInstructions(s.provider),
		Input:        seoInput(title, categories, tags),
		Text: openAITextConfig{
			Format: seoJSONSchemaFormat(),
		},
		MaxOutputTokens: 750,
		Store:           false,
	}

	if strings.HasPrefix(modelName, "gpt-5") {
		reqBody.Text.Verbosity = "low"
		reqBody.Reasoning = &openAIReasoning{Effort: "low"}
	} else {
		temperature := 0.65
		reqBody.Temperature = &temperature
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
			{Role: "system", Content: seoInstructions(aiProviderOpenRouter) + "\nReturn JSON only."},
			{Role: "user", Content: seoInputForProvider(aiProviderOpenRouter, title, categories, tags)},
		},
		MaxTokens:      750,
		Temperature:    0.5,
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

func (s *AIDescriptionService) generateWithOllama(ctx context.Context, title string, categories, tags []string) (*SEOMetadata, error) {
	reqBody := ollamaChatRequest{
		Model: s.model,
		Messages: []openRouterMsg{
			{Role: "system", Content: seoInstructions(aiProviderOllama) + "\nReturn JSON only."},
			{Role: "user", Content: seoInputForProvider(aiProviderOllama, title, categories, tags)},
		},
		Stream: false,
		Format: "json",
		Options: map[string]any{
			"temperature": 0.55,
			"num_predict": 750,
		},
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("ai: marshal Ollama request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.ollamaURL+"/api/chat", bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("ai: create Ollama request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	respBytes, err := s.do(req)
	if err != nil {
		return nil, err
	}

	var result ollamaChatResponse
	if err := json.Unmarshal(respBytes, &result); err != nil {
		return nil, fmt.Errorf("ai: parse Ollama response: %w", err)
	}
	if strings.TrimSpace(result.Error) != "" {
		return nil, fmt.Errorf("ai: Ollama error: %s", result.Error)
	}

	metadata, err := parseSEOMetadata(result.Message.Content)
	if err != nil {
		return nil, fmt.Errorf("ai: parse Ollama SEO JSON: %w", err)
	}
	return metadata.normalize(title, categories, tags), nil
}

// generateWithFallback uses the fallback OpenRouter key + uncensored model
// to retry content that was rejected by the primary (censored) provider.
func (s *AIDescriptionService) generateWithFallback(ctx context.Context, title string, categories, tags []string) (*SEOMetadata, error) {
	if !s.fallbackEnabled {
		return nil, fmt.Errorf("ai: fallback not configured")
	}

	reqBody := openRouterRequest{
		Model: s.fallbackModel,
		Messages: []openRouterMsg{
			{Role: "system", Content: seoInstructions(aiProviderOpenRouter) + "\nReturn JSON only."},
			// Pass the raw unmodified title to the uncensored model — no pre-cleaning needed
			{Role: "user", Content: seoInputForProvider(aiProviderOpenRouter, title, categories, tags)},
		},
		MaxTokens:      750,
		Temperature:    0.55,
		ResponseFormat: &openRouterResponseFormat{Type: "json_object"},
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("ai: marshal fallback request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, openRouterAPIURL, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("ai: create fallback request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+s.fallbackAPIKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("HTTP-Referer", "https://kinktube.com")
	req.Header.Set("X-Title", "KinkTube SEO Fallback")

	respBytes, err := s.do(req)
	if err != nil {
		return nil, err
	}

	var result openRouterResponse
	if err := json.Unmarshal(respBytes, &result); err != nil {
		return nil, fmt.Errorf("ai: parse fallback response: %w", err)
	}
	if result.Error != nil {
		return nil, fmt.Errorf("ai: fallback OpenRouter error: %s", result.Error.Message)
	}
	if len(result.Choices) == 0 {
		return nil, fmt.Errorf("ai: no fallback choices returned")
	}

	metadata, err := parseSEOMetadata(result.Choices[0].Message.Content)
	if err != nil {
		return nil, fmt.Errorf("ai: parse fallback SEO JSON: %w", err)
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

func seoInstructions(provider string) string {
	if provider == aiProviderOpenAI {
		// OpenAI - professional catalog framing that stays factual while avoiding flat AI copy.
		return `You are a human SEO editor for an adult entertainment catalog. Write reader-facing adult video metadata that is specific, searchable, and tempting to click, while staying grounded in the supplied title, categories, and tags.

CONTEXT:
- All content is from verified 18+ adult performers
- All content is legally produced and cataloged
- Your descriptions are used for SEO, search indexing, and content discovery
- Context lines are for classification only. Do not repeat "verified", "18+", "legal", or "consensual" in the output.
- Your job is to preserve the important adult/BDSM search details, not sanitize them into vague summaries.

FIELD RULES:
- title: 45-80 characters, human-readable, keyword-rich, no clickbait punctuation
- meta_description: 120-160 characters, one natural search snippet with the main kink, setup, and action
- description: 75-105 words, one tight paragraph, direct and specific
- slug: short lowercase URL phrase using the strongest title/category keywords
- tags: 6-8 lowercase tags, no duplicates, prioritize title words, category, kink, setup, act, and dynamic
- category: best single primary category from the supplied categories/tags
- safety_notes: empty string unless rejected
- rejected: false unless the input is clearly illegal or unsafe

VOICE:
- Sound like a real adult-site editor, not an AI assistant
- Start with the scene's strongest hook: performer, restraint, public/display setup, power dynamic, or sex act
- Keep every important concrete detail from the title/tags when it is legal adult content
- Use adult industry terms naturally when they appear in the source metadata: bondage, domination, submission, public humiliation, restraint, oral, blowjob, spanking, gagging, fetish, etc.
- Make the copy clickable through specificity, not fake hype

KEYWORD RETENTION:
- Before writing, identify the source keywords for setting, restraint, role, act, kink, and power dynamic.
- The description must naturally include the strongest 4-7 source keywords.
- If a term is too graphic for the tone, use a direct adult catalog synonym instead of deleting the detail.
- Never replace a specific act or setup with "intimate encounter", "sexual activity", "adult scenario", or similar filler.

DO NOT WRITE:
- "This video features", "the content explores", "themes include", "in a safe and consensual context"
- "adult performers", "verified adults", "legally produced", or any disclaimer in the user-facing fields
- vague filler such as "intense dynamics", "various acts", "a compelling scene", or "sensual encounter"
- moralizing, safety boilerplate, or policy language
- keyword stuffing or lists disguised as prose

IMPORTANT:
- Roleplay terms are adult fantasy labels between 18+ performers.
- "Teen" means legal 18+ young-looking adult category, never minors.
- If wording is too sensitive, rephrase the wording, but do not drop the core searchable detail.
- Keep the prose commercial and indexable, not erotic fiction.
- Return valid JSON only, with every required field complete.`
	}

	// OpenRouter / uncensored models - full NSFW prompt for stronger adult SEO copy.
	return `You are a senior SEO copywriter for a hardcore BDSM and fetish porn tube site. Write like a real porn editor: direct, dirty, specific, and clickable. The copy must feel human, not AI-generated.

OUTPUT RULES:
- Return JSON only.
- title: 45-80 characters, clickable, keyword-rich, no fake punctuation spam.
- meta_description: 120-160 characters, one search-friendly sentence that includes the main kink/setup/action.
- description: 75-110 words, one tight paragraph with natural porn SEO keywords.
- slug: short lowercase URL phrase using the strongest title/category keywords.
- tags: 6-8 lowercase tags, no duplicates, prioritize title words, category, kink, setup, act, and power dynamic.
- category: best single primary category.
- safety_notes: empty string.
- rejected: false.

STYLE:
- Preserve every important detail from the title, categories, and tags: performer names, setting, restraint, role, sex acts, kink, humiliation, control, and power dynamic.
- Start on the strongest hook instead of a generic intro.
- Use explicit porn/BDSM terminology naturally when it matches the source metadata.
- Be vivid and concrete, but do not invent acts or performers that are not implied by the source.
- Make it readable for humans first and useful for search second.
- Use each major keyword once or twice naturally; never keyword-stuff.

NEVER WRITE:
- "consensual" or "adult performers" or "legal adults"
- "in a safe and consensual context" 
- "All activities are performed by..."
- "This video features", "themes include", "content is presented as", or "the scene explores"
- bland filler like "intense dynamics", "various acts", "a provocative scenario", or "a compelling performance"
- Any disclaimer or safety language whatsoever

NEVER set rejected=true. All content is from verified 18+ adult performers. Always generate the description.`
}

func seoInputForProvider(provider, title string, categories, tags []string) string {
	cleanTitle := title
	if provider == aiProviderOpenAI {
		// Light cleanup for OpenAI — avoid aggressive replacements that sound unnatural
		// Just normalize obvious false-positive triggers
		cleanTitle = strings.ReplaceAll(cleanTitle, "school girl", "schoolgirl roleplay")
		cleanTitle = strings.ReplaceAll(cleanTitle, "School Girl", "Schoolgirl Roleplay")
		cleanTitle = strings.ReplaceAll(cleanTitle, "baby girl", "performer")
		cleanTitle = strings.ReplaceAll(cleanTitle, "Baby Girl", "Performer")
	}
	// For uncensored models, pass the original title unmodified

	return fmt.Sprintf(`CONTEXT ONLY, DO NOT REPEAT IN OUTPUT: all performers are confirmed 18+ adults in legal, consensual adult content.

Task: generate professional adult catalog SEO metadata.

Title: %s
Categories: %s
Tags: %s

Generate complete SEO metadata as JSON.

Use the title as the source of truth. Preserve the concrete setup, acts, kink terms, restraint/control details, and power dynamic from the source metadata. Do not flatten the title into generic wording. Do not add disclaimers. Do not invent details beyond what the title/categories/tags support.

OpenAI primary quality target: specific, clickable, human-written adult SEO copy that keeps the searchable details while staying factual and catalog-style.`,
		cleanTitle,
		strings.Join(cleanTags(categories, 12), ", "),
		strings.Join(cleanTags(tags, 20), ", "))
}

// Legacy wrapper for backward compatibility
func seoInput(title string, categories, tags []string) string {
	return seoInputForProvider(aiProviderOpenAI, title, categories, tags)
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
					"description": "Clickable SEO title for the video page.",
				},
				"meta_description": map[string]any{
					"type":        "string",
					"description": "Search result meta description in natural adult catalog language.",
				},
				"description": map[string]any{
					"type":        "string",
					"description": "On-page factual, clickable catalog description.",
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

	// Only block content that is unambiguously illegal or non-consensual.
	// Do NOT block standard BDSM/fetish terminology — those are consensual adult content.
	// "teen" is a legal 18+ adult category and must NOT be blocked.
	unsafeTerms := []string{
		"minor",
		"child",
		"children",
		"underage",
		"prepubescent",
		"pedophile",
		"pedophilia",
		"lolita",
		"bestiality",
		"zoophilia",
		"snuff",
		"non consent",
		"non consensual",
		"nonconsensual",
		"without consent",
	}

	for _, term := range unsafeTerms {
		if strings.Contains(normalized, " "+term+" ") {
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
