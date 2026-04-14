package services

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"kinktube/internal/models"
)

// EpornerClient handles API requests to Eporner
type EpornerClient struct {
	baseURL    string
	httpClient *http.Client
	rateLimiter *rateLimiter
}

// rateLimiter implements a simple token bucket rate limiter
type rateLimiter struct {
	mu           sync.Mutex
	tokens       int
	maxTokens    int
	refillRate   time.Duration
	lastRefill   time.Time
}

func newRateLimiter(maxTokens int, refillRate time.Duration) *rateLimiter {
	return &rateLimiter{
		tokens:     maxTokens,
		maxTokens:  maxTokens,
		refillRate: refillRate,
		lastRefill: time.Now(),
	}
}

func (r *rateLimiter) acquire(ctx context.Context) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Refill tokens based on elapsed time
	now := time.Now()
	elapsed := now.Sub(r.lastRefill)
	tokensToAdd := int(elapsed / r.refillRate)
	if tokensToAdd > 0 {
		r.tokens = min(r.tokens+tokensToAdd, r.maxTokens)
		r.lastRefill = now
	}

	if r.tokens <= 0 {
		// Wait for next token
		waitTime := r.refillRate - time.Since(r.lastRefill)
		r.mu.Unlock()
		select {
		case <-time.After(waitTime):
		case <-ctx.Done():
			return ctx.Err()
		}
		r.mu.Lock()
		r.tokens = 1
		r.lastRefill = time.Now()
	}

	r.tokens--
	return nil
}

// EpornerResponse represents the API response structure
type EpornerResponse struct {
	Count   int            `json:"count"`
	PerPage int            `json:"per_page"`
	Page    int            `json:"page"`
	Videos  []EpornerVideo `json:"videos"`
}

// EpornerVideo represents a single video from the API
type EpornerVideo struct {
	ID           string            `json:"id"`
	Title        string            `json:"title"`
	Keywords     string            `json:"keywords"`
	Views        json.Number       `json:"views"`
	Rate         json.Number       `json:"rate"`
	URL          string            `json:"url"`
	AddedOn      string            `json:"added"`
	LengthSec    int               `json:"length_sec"`
	LengthMin    string            `json:"length_min"`
	Embed        string            `json:"embed"`
	DefaultThumb EpornerThumb      `json:"default_thumb"`
	Thumbs       []EpornerThumb    `json:"thumbs"`
}

// EpornerThumb represents thumbnail data
type EpornerThumb struct {
	Size   string `json:"size"`
	Width  int    `json:"width"`
	Height int    `json:"height"`
	Src    string `json:"src"`
}

var bdsmRelevanceTerms = []string{
	// Core terms
	"bdsm",
	"bondage",
	"femdom",
	"female domination",
	"dominatrix",
	"mistress",
	"domme",
	"goddess",
	"slave",
	"submission",
	"submissive",
	"shibari",
	"suspension",
	"hogtie",
	"hogtied",
	"predicament",
	"rope",
	"device bondage",
	"medical bondage",
	"vacbed",
	"spreader bar",
	"spanking",
	"caning",
	"crop",
	"whipping",
	"latex",
	"rubber",
	"catsuit",
	"leather",
	"gag",
	"handcuffs",
	"blindfold",
	"foot worship",
	"facesitting",
	"smothering",
	"strapon",
	"pegging",
	"cbt",
	"ball busting",
	"cock torture",
	"chastity",
	"orgasm control",
	"wax play",
	"electro play",
	// Extreme/intense terms
	"kinbaku",
	"mummification",
	"mummified",
	"armbinder",
	"straitjacket",
	"breath play",
	"breath control",
	"hood",
	"sensory deprivation",
	"forced orgasm",
	"ruined orgasm",
	"tease denial",
	"edging",
	"human furniture",
	"objectification",
	"sissification",
	"feminization",
	"pony play",
	"pet play",
	"puppy play",
	"boot worship",
	"corporal punishment",
	"severe",
	"tight bondage",
	"extreme",
	"dungeon",
	"torture",
	"torment",
	"harsh",
	"strict",
	"cruel",
	"brutal",
	"intense",
	"inescapable",
	"encased",
	"wrapped",
}

// bdsmEnhancementTerms - niche terms that need "bdsm" appended for quality results
var bdsmEnhancementTerms = []string{
	"pet play", "puppy play", "pony play", "kitten play",
	"chastity", "cage",
	"wax play", "electro play", "orgasm control", "edging",
	"tease denial", "breath play", "sensory deprivation",
	"collar", "leash", "worship", "humiliation", "degradation",
	"objectification", "furniture", "trampling", "smothering",
}

// EnhanceQueryForBDSM appends "bdsm" to niche terms that benefit from it
func EnhanceQueryForBDSM(query string) string {
	queryLower := strings.ToLower(strings.TrimSpace(query))

	// Skip if already contains BDSM-related terms
	if strings.Contains(queryLower, "bdsm") ||
		strings.Contains(queryLower, "bondage") ||
		strings.Contains(queryLower, "femdom") ||
		strings.Contains(queryLower, "dominat") {
		return query
	}

	for _, term := range bdsmEnhancementTerms {
		if strings.Contains(queryLower, term) {
			return query + " bdsm"
		}
	}
	return query
}

// NewEpornerClient creates a new Eporner API client
func NewEpornerClient(baseURL string) *EpornerClient {
	transport := http.DefaultTransport.(*http.Transport).Clone()

	// Support HTTP_PROXY/HTTPS_PROXY environment variables
	if proxyURL := os.Getenv("HTTP_PROXY"); proxyURL != "" {
		if proxy, err := url.Parse(proxyURL); err == nil {
			transport.Proxy = http.ProxyURL(proxy)
		}
	}

	return &EpornerClient{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout:   30 * time.Second,
			Transport: transport,
		},
		// Allow 10 requests per second, with burst of 20
		rateLimiter: newRateLimiter(20, 100*time.Millisecond),
	}
}

// SearchVideos searches for videos with given query
func (c *EpornerClient) SearchVideos(ctx context.Context, query string, page, perPage int) (*EpornerResponse, error) {
	// Apply rate limiting
	if err := c.rateLimiter.acquire(ctx); err != nil {
		return nil, fmt.Errorf("rate limiter error: %w", err)
	}

	// Enhance query for better BDSM results
	enhancedQuery := EnhanceQueryForBDSM(query)

	params := url.Values{}
	params.Set("query", enhancedQuery)
	params.Set("page", strconv.Itoa(page))
	params.Set("per_page", strconv.Itoa(perPage))
	params.Set("thumbsize", "big")
	params.Set("order", "latest")
	params.Set("gay", "0")
	params.Set("lq", "0") // Exclude low quality
	params.Set("format", "json")

	requestURL := fmt.Sprintf("%s/video/search/?%s", c.baseURL, params.Encode())

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("User-Agent", "KinkTube/1.0")
	req.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API returned status %d: %s", resp.StatusCode, string(body))
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	if len(body) > 0 && body[0] == '<' {
		snippet := strings.TrimSpace(string(body))
		if len(snippet) > 200 {
			snippet = snippet[:200]
		}
		return nil, fmt.Errorf("API returned HTML instead of JSON: %s", snippet)
	}

	var result EpornerResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &result, nil
}

// IsRelevantBDSMVideo filters out generic porn results that slip into broad searches.
func IsRelevantBDSMVideo(ev *EpornerVideo) bool {
	text := strings.ToLower(ev.Title + " " + ev.Keywords)

	for _, term := range bdsmRelevanceTerms {
		if strings.Contains(text, term) {
			return true
		}
	}

	return false
}

// ConvertToVideo converts an Eporner video to our internal model
func ConvertToVideo(ev *EpornerVideo, keyword string) *models.Video {
	views, _ := ev.Views.Int64()
	rating, _ := ev.Rate.Float64()

	// Get the best thumbnail
	thumbnail := ev.DefaultThumb.Src
	thumbnailLg := thumbnail

	// Look for larger thumbnail
	for _, t := range ev.Thumbs {
		if t.Width >= 640 {
			thumbnailLg = t.Src
			break
		}
	}

	// Parse publish date
	publishedAt, _ := time.Parse("2006-01-02 15:04:05", ev.AddedOn)

	// Extract categories from keywords
	categories := extractCategories(ev.Keywords)

	// Extract tags
	tags := extractTags(ev.Keywords)

	return &models.Video{
		ExternalID:  ev.ID,
		Title:       ev.Title,
		Description: "", // Eporner doesn't provide descriptions in search
		Duration:    ev.LengthSec,
		DurationStr: ev.LengthMin,
		Views:       views,
		Rating:      rating,
		Thumbnail:   thumbnail,
		ThumbnailLg: thumbnailLg,
		EmbedURL:    ev.Embed,
		SourceURL:   ev.URL,
		Tags:        tags,
		Categories:  categories,
		Keywords:    keyword,
		PublishedAt: publishedAt,
	}
}

// extractCategories extracts BDSM-related categories from keywords
func extractCategories(keywords string) []string {
	keywords = strings.ToLower(keywords)
	var categories []string
	seen := make(map[string]bool)

	categoryMap := map[string]string{
		// Core mappings
		"femdom":              "femdom",
		"female domination":  "femdom",
		"domme":               "femdom",
		"goddess":             "femdom",
		"dominatrix":          "dominatrix",
		"mistress":            "dominatrix",
		"bondage":             "bondage",
		"rope":                "bondage",
		"tied":                "bondage",
		"shibari":             "shibari",
		"kinbaku":             "shibari",
		"suspension":          "shibari",
		"hogtie":              "bondage",
		"hogtied":             "bondage",
		"handcuffs":           "bondage",
		"blindfold":           "bondage",
		"gag":                 "bondage",
		"bdsm":                "bdsm",
		"slave":               "slave",
		"submission":          "submission",
		"submissive":          "submission",
		"slave training":      "submission",
		"orgasm control":      "chastity",
		"chastity":            "chastity",
		"ruined orgasm":       "chastity",
		"forced orgasm":       "chastity",
		"edging":              "chastity",
		"tease denial":        "chastity",
		"spanking":            "spanking",
		"caning":              "caning",
		"paddling":            "spanking",
		"crop":                "spanking",
		"whipping":            "whipping",
		"latex":               "latex",
		"rubber":              "latex",
		"catsuit":             "latex",
		"heavy rubber":        "latex",
		"leather":             "leather",
		"foot":                "foot-fetish",
		"feet":                "foot-fetish",
		"boot worship":        "foot-fetish",
		"facesitting":         "facesitting",
		"face sitting":        "facesitting",
		"smothering":          "facesitting",
		"strapon":             "strapon",
		"strap-on":            "strapon",
		"pegging":             "strapon",
		"cbt":                 "cbt",
		"ball busting":        "cbt",
		"cock torture":        "cbt",
		"device":              "device-bondage",
		"medical bondage":     "medical-bondage",
		"vacbed":              "medical-bondage",
		"spreader bar":        "medical-bondage",
		// Extreme category mappings
		"mummification":       "mummification",
		"mummified":           "mummification",
		"encased":             "mummification",
		"wrapped":             "mummification",
		"predicament":         "predicament",
		"predicament bondage": "predicament",
		"sensory deprivation": "sensory-deprivation",
		"hood":                "sensory-deprivation",
		"isolation":           "sensory-deprivation",
		"extreme bondage":     "extreme-bondage",
		"tight bondage":       "extreme-bondage",
		"inescapable":         "extreme-bondage",
		"straitjacket":        "extreme-bondage",
		"armbinder":           "extreme-bondage",
		"severe":              "severe-discipline",
		"harsh":               "severe-discipline",
		"brutal":              "severe-discipline",
		"corporal punishment": "severe-discipline",
		"judicial":            "severe-discipline",
		"pony play":           "pet-play",
		"puppy play":          "pet-play",
		"pet play":            "pet-play",
		"kitten play":         "pet-play",
	}

	for key, cat := range categoryMap {
		if strings.Contains(keywords, key) && !seen[cat] {
			categories = append(categories, cat)
			seen[cat] = true
		}
	}

	// Default to bdsm if no specific category found
	if len(categories) == 0 {
		categories = append(categories, "bdsm")
	}

	return categories
}

// extractTags extracts individual tags from keywords string
func extractTags(keywords string) []string {
	// Split by comma and clean up
	parts := strings.Split(keywords, ",")
	var tags []string

	for _, part := range parts {
		tag := strings.TrimSpace(strings.ToLower(part))
		if tag != "" && len(tag) <= 50 {
			tags = append(tags, tag)
		}
	}

	// Limit to 20 tags max
	if len(tags) > 20 {
		tags = tags[:20]
	}

	return tags
}
