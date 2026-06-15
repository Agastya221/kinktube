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
	baseURL     string
	httpClient  *http.Client
	rateLimiter *rateLimiter
}

// rateLimiter implements a simple token bucket rate limiter
type rateLimiter struct {
	mu         sync.Mutex
	tokens     int
	maxTokens  int
	refillRate time.Duration
	lastRefill time.Time
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
	ID           string         `json:"id"`
	Title        string         `json:"title"`
	Keywords     string         `json:"keywords"`
	Views        json.Number    `json:"views"`
	Rate         json.Number    `json:"rate"`
	URL          string         `json:"url"`
	AddedOn      string         `json:"added"`
	LengthSec    int            `json:"length_sec"`
	LengthMin    string         `json:"length_min"`
	Embed        string         `json:"embed"`
	DefaultThumb EpornerThumb   `json:"default_thumb"`
	Thumbs       []EpornerThumb `json:"thumbs"`
}

// EpornerThumb represents thumbnail data
type EpornerThumb struct {
	Size   string `json:"size"`
	Width  int    `json:"width"`
	Height int    `json:"height"`
	Src    string `json:"src"`
}

// bdsmStrongTerms are unambiguously BDSM — a single match is sufficient evidence.
var bdsmStrongTerms = []string{
	// Core BDSM identity
	"bdsm",
	"bondage",
	"femdom",
	"female domination",
	"dominatrix",
	"mistress",
	"domme",
	"slave training",
	"submission",
	"submissive",
	"shibari",
	"kinbaku",
	"hogtie",
	"hogtied",
	"predicament bondage",
	"device bondage",
	"medical bondage",
	"vacbed",
	"spreader bar",
	// Impact play
	"spanking",
	"caning",
	"whipping",
	"corporal punishment",
	// Fetish gear
	"latex fetish",
	"rubber fetish",
	"catsuit",
	"ball gag",
	"mouth gag",
	"handcuffs",
	"blindfold bondage",
	// Body worship / control
	"foot worship",
	"boot worship",
	"facesitting",
	"smothering",
	"strapon",
	"pegging",
	// CBT / genital control
	"cbt",
	"ball busting",
	"cock torture",
	"chastity",
	"orgasm control",
	"forced orgasm",
	"ruined orgasm",
	"tease denial",
	// Sensation play
	"wax play",
	"electro play",
	"electro torture",
	"violet wand",
	// Extreme bondage
	"mummification",
	"mummified",
	"armbinder",
	"straitjacket",
	"breath play",
	"breath control",
	"sensory deprivation",
	"tight bondage",
	"extreme bondage",
	"inescapable bondage",
	"suspension bondage",
	// Roles & dynamics
	"slave",
	"human furniture",
	"objectification",
	"sissification",
	"feminization",
	"pony play",
	"pet play",
	"puppy play",
	"public humiliation",
	// Environments
	"dungeon",
}

// bdsmWeakTerms are generic words that CAN indicate BDSM but also appear in vanilla
// content. A video must contain at least 2 of these (or 1 strong + any weak) to qualify.
var bdsmWeakTerms = []string{
	"dominant",
	"goddess",
	"rope",
	"crop",
	"leather",
	"latex",
	"rubber",
	"gag",
	"blindfold",
	"hood",
	"collar",
	"leash",
	"edging",
	"humiliation",
	"degradation",
	"predicament",
	"suspension",
	"torture",
	"torment",
	"encased",
	"wrapped",
	// These are the most problematic — too generic on their own
	"extreme",
	"severe",
	"harsh",
	"strict",
	"cruel",
	"brutal",
	"intense",
	"inescapable",
	"tied",
	"restrained",
}

// vanillaHardBlock — ALWAYS reject, even if BDSM terms present.
// Family roleplay is off-brand for a BDSM site regardless of context.
var vanillaHardBlock = []string{
	"step mom", "stepmom", "step-mom", "stepmoms",
	"step mother", "stepmother",
	"step sister", "stepsister", "step-sister", "stepsisters",
	"step brother", "stepbrother", "step-brother", "stepbrothers",
	"step dad", "stepdad", "step-dad", "stepdads",
	"step daughter", "stepdaughter", "stepdaughters",
	"step son", "stepson", "stepsons",
	"step family", "stepfamily",
	// Known vanilla studios
	"brazzers", "reality kings", "bangbus", "bang bus",
	"fake taxi", "fake agent", "fake hospital",
	"blacked", "tushy", "vixen",
	"nubiles", "mofos", "digital playground",
	// Link spam
	"onlyfans.com", "linktr.ee", "fansly.com",
}

// vanillaSoftBlock — reject unless the TITLE itself has a strong BDSM term.
var vanillaSoftBlock = []string{
	"yoga", "gym", "massage", "massaged",
	"casting couch", "casting", "audition",
	"interview porn",
	"shower spy",
	"college party", "spring break", "pool party", "beach",
	"pickup", "pick up",
	"barely legal", "girl next door", "next door",
	"innocent", "nerdy",
}

// vanillaBodyIndicators — vanilla porn descriptors. If ≥2 match AND title
// has zero strong BDSM terms, reject. Prevents "Latina Bounces Booty" type.
var vanillaBodyIndicators = []string{
	"bounces", "bouncing",
	"rides cock", "rides dick", "rides his",
	"lucky stud", "lucky guy",
	"oiled up", "oiled booty", "oiled ass",
	"twerking", "twerk",
	"pov blowjob", "pov bj",
	"girlsinmycity", "fuckthis",
	"booty shake", "booty bounce",
	"thick latina", "big booty latina",
	"yoga pants",
}

// bdsmRelevanceTerms is the combined list used by IsStrongBDSMMatch and IsBDSMRelatedQuery.
var bdsmRelevanceTerms = append(append([]string{}, bdsmStrongTerms...), bdsmWeakTerms...)

// bdsmEnhancementTerms - niche terms that need "bdsm" appended for quality results
var bdsmEnhancementTerms = []string{
	"pet play", "puppy play", "pony play", "kitten play",
	"chastity", "cage",
	"wax play", "electro play", "orgasm control", "edging",
	"tease denial", "breath play", "sensory deprivation",
	"collar", "leash", "worship", "humiliation", "degradation", "public humiliation",
	"objectification", "furniture", "trampling", "smothering",
}

var enhancedQueryOverrides = map[string]string{
	"pet play":            "pet play bdsm",
	"petplay":             "pet play bdsm",
	"puppy play":          "puppy play bdsm",
	"pony play":           "pony play bdsm",
	"kitten play":         "kitten play bdsm",
	"chastity":            "chastity belt bdsm",
	"orgasm control":      "orgasm control bdsm",
	"tease and denial":    "tease and denial bdsm",
	"tease denial":        "tease denial bdsm",
	"edging":              "edging bdsm",
	"wax play":            "wax play bdsm",
	"electro play":        "electro play bdsm",
	"sensory deprivation": "sensory deprivation bdsm",
	"breath play":         "breath play bdsm",
	"latex":               "latex rubber catsuit bdsm",
	"medical bondage":     "medical bondage bdsm",
	"vacbed":              "vacbed bdsm",
	"spreader bar":        "spreader bar bdsm",
}

var queryIntentTerms = map[string][]string{
	"pet play":            {"pet play", "puppy play", "pony play", "kitten play", "human pet"},
	"wax play":            {"wax play", "candle wax", "hot wax"},
	"electro play":        {"electro play", "electro torture", "violet wand", "estim"},
	"sensory deprivation": {"sensory deprivation", "blindfold", "hood", "isolation"},
	"breath play":         {"breath play", "breath control"},
	"latex":               {"latex", "rubber", "catsuit", "rubber fetish"},
	"medical bondage":     {"medical bondage", "medical", "clinical", "vacbed", "spreader bar"},
	"mummification":       {"mummification", "mummified", "encased", "wrapped"},
	"public humiliation":  {"public humiliation", "humiliation", "degradation", "embarrassment"},
	"shibari":             {"shibari", "kinbaku", "suspension"},
}

func normalizeSearchQuery(query string) string {
	query = strings.ToLower(strings.TrimSpace(query))
	query = strings.ReplaceAll(query, "-", " ")
	query = strings.Join(strings.Fields(query), " ")
	query = strings.TrimSuffix(query, " bdsm")
	return strings.TrimSpace(query)
}

// EnhanceQueryForBDSM appends "bdsm" to niche terms that benefit from it
func EnhanceQueryForBDSM(query string) string {
	queryLower := normalizeSearchQuery(query)

	if exact, ok := enhancedQueryOverrides[queryLower]; ok {
		return exact
	}

	// Skip if already contains BDSM-related terms
	if strings.Contains(strings.ToLower(strings.TrimSpace(query)), "bdsm") ||
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

// SearchOptions contains optional parameters for Eporner search
type SearchOptions struct {
	Order string // "latest", "longest", "shortest", "top-rated", "most-popular", "top-weekly", "top-monthly"
}

// SearchVideos searches for videos with given query (minimal params for best results)
func (c *EpornerClient) SearchVideos(ctx context.Context, query string, page, perPage int) (*EpornerResponse, error) {
	return c.SearchVideosWithOptions(ctx, query, page, perPage, nil)
}

// SearchVideosWithOptions searches with optional parameters (use sparingly - only when needed)
func (c *EpornerClient) SearchVideosWithOptions(ctx context.Context, query string, page, perPage int, opts *SearchOptions) (*EpornerResponse, error) {
	// Apply rate limiting
	if err := c.rateLimiter.acquire(ctx); err != nil {
		return nil, fmt.Errorf("rate limiter error: %w", err)
	}

	// Enhance query for better BDSM results
	enhancedQuery := EnhanceQueryForBDSM(query)

	// Build minimal params - only what's strictly needed
	params := url.Values{}
	params.Set("query", enhancedQuery)
	params.Set("page", strconv.Itoa(page))
	params.Set("per_page", strconv.Itoa(perPage))
	params.Set("format", "json")

	// Only add order if explicitly requested (e.g., importer wants "latest")
	if opts != nil && opts.Order != "" {
		params.Set("order", opts.Order)
	}

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

// VideoExists checks whether a video ID is still available on Eporner.
// Uses the /api/v2/video/get/ endpoint which is fast (single record).
//
// Returns:
//   - (true,  nil)   — video definitely exists
//   - (false, nil)   — video is definitively deleted/private (API returned an error payload or 404)
//   - (false, error) — could not determine status (network error, timeout, rate-limit, etc.)
//
// Callers MUST check the error: only mark a video unavailable when err == nil && exists == false.
func (c *EpornerClient) VideoExists(ctx context.Context, externalID string) (bool, error) {
	if externalID == "" {
		return false, nil // empty ID is always invalid
	}

	params := url.Values{}
	params.Set("id", externalID)
	params.Set("format", "json")

	requestURL := fmt.Sprintf("%s/video/get/?%s", c.baseURL, params.Encode())

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL, nil)
	if err != nil {
		return false, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("User-Agent", "KinkTube/1.0")
	req.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return false, fmt.Errorf("http request failed: %w", err)
	}
	defer resp.Body.Close()

	// 404 = definitively gone
	if resp.StatusCode == http.StatusNotFound {
		return false, nil
	}

	// Rate-limited or server error = inconclusive, do NOT treat as "deleted"
	if resp.StatusCode == http.StatusTooManyRequests ||
		resp.StatusCode >= http.StatusInternalServerError {
		return false, fmt.Errorf("API returned status %d for video %s", resp.StatusCode, externalID)
	}

	if resp.StatusCode != http.StatusOK {
		return false, fmt.Errorf("unexpected status %d for video %s", resp.StatusCode, externalID)
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, 4096))
	if err != nil {
		return false, fmt.Errorf("read response body: %w", err)
	}

	// Empty body = Eporner dropped the connection (soft rate-limit), treat as inconclusive
	if len(body) == 0 {
		return false, fmt.Errorf("empty response body for video %s (likely rate-limited)", externalID)
	}

	// Eporner returns {"id":"...","title":"...",...} for valid videos
	// and {"error":"..."} for invalid ones
	var payload map[string]interface{}
	if err := json.Unmarshal(body, &payload); err != nil {
		return false, fmt.Errorf("parse JSON: %w", err)
	}

	// If there's an "error" key the video doesn't exist — this IS definitive
	if _, hasErr := payload["error"]; hasErr {
		return false, nil
	}

	// Must have an id field matching what we asked for
	if idVal, ok := payload["id"]; ok {
		if idStr, ok := idVal.(string); ok && idStr != "" {
			return true, nil
		}
	}

	return false, nil
}

// epornerRemovedEntry is the JSON shape of each item in the /api/v2/video/removed/ response.
type epornerRemovedEntry struct {
	ID string `json:"id"`
}

// GetRemovedVideoIDs fetches all video IDs that have been removed from Eporner in a single
// API call. This is the most efficient way to keep the local catalog clean — one HTTP request
// instead of per-video checks.
//
// The endpoint returns a (potentially multi-megabyte) JSON array like:
//
//	[{"id":"5UF0dWoWUdR"},{"id":"ez8cbX4tDtd"},...]
//
// Returns a flat slice of external ID strings. On any network / parse error the caller
// should log and retry later rather than treating all videos as deleted.
func (c *EpornerClient) GetRemovedVideoIDs(ctx context.Context) ([]string, error) {
	params := url.Values{}
	params.Set("format", "json")

	requestURL := fmt.Sprintf("%s/video/removed/?%s", c.baseURL, params.Encode())

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL, nil)
	if err != nil {
		return nil, fmt.Errorf("create removed-videos request: %w", err)
	}
	req.Header.Set("User-Agent", "KinkTube/1.0")
	req.Header.Set("Accept", "application/json")

	// The removed list can be several megabytes — use a dedicated client with a longer timeout.
	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetch removed-videos list: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusTooManyRequests || resp.StatusCode >= http.StatusInternalServerError {
		return nil, fmt.Errorf("eporner removed-videos API returned status %d (rate-limited or server error)", resp.StatusCode)
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("eporner removed-videos API returned unexpected status %d", resp.StatusCode)
	}

	// Limit body to 50 MB as a safety guard against absurdly large responses.
	body, err := io.ReadAll(io.LimitReader(resp.Body, 50*1024*1024))
	if err != nil {
		return nil, fmt.Errorf("read removed-videos response: %w", err)
	}

	if len(body) == 0 {
		return nil, fmt.Errorf("eporner removed-videos API returned an empty body")
	}

	var entries []epornerRemovedEntry
	if err := json.Unmarshal(body, &entries); err != nil {
		return nil, fmt.Errorf("parse removed-videos JSON: %w", err)
	}

	ids := make([]string, 0, len(entries))
	for _, e := range entries {
		if e.ID != "" {
			ids = append(ids, e.ID)
		}
	}
	return ids, nil
}

// containsAnyStrongBDSM returns true if the text contains at least one strong BDSM term.
func containsAnyStrongBDSM(text string) bool {
	for _, term := range bdsmStrongTerms {
		if strings.Contains(text, term) {
			return true
		}
	}
	return false
}

// countWeakBDSM returns the number of distinct weak BDSM terms found in text.
func countWeakBDSM(text string) int {
	count := 0
	for _, term := range bdsmWeakTerms {
		if strings.Contains(text, term) {
			count++
		}
	}
	return count
}

// isHardBlocked returns true if the text matches a hard-block vanilla term.
func isHardBlocked(text string) bool {
	for _, term := range vanillaHardBlock {
		if strings.Contains(text, term) {
			return true
		}
	}
	return false
}

// isSoftBlocked returns true if the text matches a soft-block vanilla term.
func isSoftBlocked(text string) bool {
	for _, term := range vanillaSoftBlock {
		if strings.Contains(text, term) {
			return true
		}
	}
	return false
}

// countBodyIndicators returns the number of vanilla body indicator matches.
func countBodyIndicators(text string) int {
	count := 0
	for _, term := range vanillaBodyIndicators {
		if strings.Contains(text, term) {
			count++
		}
	}
	return count
}

// IsRelevantBDSMVideo filters out generic porn results that slip into broad searches.
// Uses a 4-layer check with title vs. keywords separation:
//  1. Must be English text
//  2. Hard vanilla block — always reject (family roleplay, vanilla studios)
//  3. Title must independently show BDSM evidence (prevents keyword stuffing)
//  4. Soft vanilla / body indicators — reject if title lacks strong BDSM proof
func IsRelevantBDSMVideo(ev *EpornerVideo) bool {
	if !models.IsLikelyEnglishText(ev.Title, ev.Keywords) {
		return false
	}

	titleLower := strings.ToLower(ev.Title)
	kwLower := strings.ToLower(ev.Keywords)
	combined := titleLower + " " + kwLower

	// ── Layer 1: Hard vanilla block — ALWAYS reject ──
	if isHardBlocked(combined) {
		return false
	}

	// ── Layer 2: Title must show BDSM evidence ──
	// This prevents Eporner keyword-stuffing from bypassing the filter.
	titleHasStrong := containsAnyStrongBDSM(titleLower)
	titleWeakCount := countWeakBDSM(titleLower)

	// The title itself must have BDSM indicators:
	//   - ≥1 strong term in title, OR
	//   - ≥2 weak terms in title, OR
	//   - 1 weak term in title + ≥1 strong term in keywords (compound evidence)
	titlePassesBDSM := titleHasStrong ||
		titleWeakCount >= 2 ||
		(titleWeakCount >= 1 && containsAnyStrongBDSM(kwLower))

	if !titlePassesBDSM {
		return false
	}

	// ── Layer 3: Soft vanilla block — reject unless title has strong BDSM ──
	if isSoftBlocked(combined) && !titleHasStrong {
		return false
	}

	// ── Layer 4: Vanilla body indicators — reject if ≥2 and no strong title ──
	if countBodyIndicators(combined) >= 2 && !titleHasStrong {
		return false
	}

	return true
}

// MatchesQueryIntent ensures niche searches stay on-topic after enhancement.
func MatchesQueryIntent(ev *EpornerVideo, query string) bool {
	baseQuery := normalizeSearchQuery(query)
	text := strings.ToLower(ev.Title + " " + ev.Keywords)

	for key, terms := range queryIntentTerms {
		if !strings.Contains(baseQuery, key) {
			continue
		}

		for _, term := range terms {
			if strings.Contains(text, term) {
				return true
			}
		}

		return false
	}

	return true
}

// MatchesTopicAndBDSM keeps imported/search results relevant to both the kink and BDSM focus.
func MatchesTopicAndBDSM(ev *EpornerVideo, query string) bool {
	return IsRelevantBDSMVideo(ev) && MatchesQueryIntent(ev, query)
}

// IsStrongBDSMMatch returns true if video has multiple BDSM indicators (stricter filter)
func IsStrongBDSMMatch(ev *EpornerVideo) bool {
	text := strings.ToLower(ev.Title + " " + ev.Keywords)
	matches := 0

	for _, term := range bdsmRelevanceTerms {
		if strings.Contains(text, term) {
			matches++
			if matches >= 2 {
				return true
			}
		}
	}

	return false
}

// IsBDSMRelatedQuery checks if the search query is related to BDSM content
func IsBDSMRelatedQuery(query string) bool {
	queryLower := strings.ToLower(strings.TrimSpace(query))

	// Check against BDSM relevance terms
	for _, term := range bdsmRelevanceTerms {
		if strings.Contains(queryLower, term) {
			return true
		}
	}

	// Check against enhancement terms
	for _, term := range bdsmEnhancementTerms {
		if strings.Contains(queryLower, term) {
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

	// Extract categories from keywords AND the import search term
	categories := extractCategoriesWithKeyword(ev.Keywords, keyword)

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

// categoryMap maps keywords to category slugs
var categoryMap = map[string]string{
	// Core mappings
	"femdom":             "femdom",
	"female domination":  "femdom",
	"domme":              "femdom",
	"goddess":            "femdom",
	"dominatrix":         "dominatrix",
	"mistress":           "dominatrix",
	"bondage":            "bondage",
	"rope":               "bondage",
	"tied":               "bondage",
	"shibari":            "shibari",
	"kinbaku":            "shibari",
	"suspension":         "shibari",
	"hogtie":             "bondage",
	"hogtied":            "bondage",
	"handcuffs":          "bondage",
	"blindfold":          "bondage",
	"gag":                "bondage",
	"bdsm":               "bdsm",
	"slave":              "slave",
	"submission":         "submission",
	"submissive":         "submission",
	"slave training":     "submission",
	"orgasm control":     "chastity",
	"chastity":           "chastity",
	"ruined orgasm":      "chastity",
	"forced orgasm":      "forced orgasm",
	"edging":             "edging",
	"tease denial":       "tease denial",
	"spanking":           "spanking",
	"caning":             "caning",
	"paddling":           "spanking",
	"crop":               "spanking",
	"whipping":           "whipping",
	"latex":              "latex",
	"rubber":             "latex",
	"catsuit":            "latex",
	"heavy rubber":       "latex",
	"leather":            "leather",
	"foot worship":       "foot-fetish",
	"foot fetish":        "foot-fetish",
	"foot slave":         "foot-fetish",
	"feet worship":       "foot-fetish",
	"boot worship":       "foot-fetish",
	"facesitting":        "facesitting",
	"face sitting":       "facesitting",
	"smothering":         "facesitting",
	"strapon":            "strapon",
	"strap-on":           "strapon",
	"pegging":            "strapon",
	"cbt":                "cbt",
	"ball busting":       "cbt",
	"cock torture":       "cbt",
	"device bondage":     "device-bondage",
	"spreader bar":       "device-bondage",
	"medical bondage":    "medical-bondage",
	"vacbed":             "vacbed",
	"vacuum bed":         "vacbed",
	"public humiliation": "public-humiliation",
	// Extreme category mappings
	"mummification":       "mummification",
	"mummified":           "mummification",
	"encased":             "mummification",
	"wrapped":             "mummification",
	"predicament":         "predicament",
	"predicament bondage": "predicament",
	"sensory deprivation": "sensory-deprivation",
	"leather hood":        "sensory-deprivation",
	"bondage hood":        "sensory-deprivation",
	"isolation bondage":   "sensory-deprivation",
	"extreme bondage":     "extreme-bondage",
	"tight bondage":       "extreme-bondage",
	"inescapable":         "extreme-bondage",
	"straitjacket":        "extreme-bondage",
	"armbinder":           "extreme-bondage",
	"severe discipline":   "severe-discipline",
	"harsh punishment":    "severe-discipline",
	"brutal punishment":   "severe-discipline",
	"corporal punishment": "severe-discipline",
	"judicial":            "severe-discipline",
	"pony play":           "pet-play",
	"puppy play":          "pet-play",
	"pet play":            "pet-play",
	"kitten play":         "pet-play",
	"human pet":           "pet-play",
	"keyholder":           "chastity",
	"orgasm denial":       "chastity",
	"clinical bondage":    "medical-bondage",
}

// extractCategoriesWithKeyword extracts categories from keywords AND the import search term
// The import keyword is given priority to ensure videos are categorized by what we searched for
func extractCategoriesWithKeyword(keywords string, importKeyword string) []string {
	seen := make(map[string]bool)
	var categories []string

	// First, check the import keyword (highest priority)
	// This ensures videos imported via "pet play" get the pet-play category
	importKeywordLower := strings.ToLower(importKeyword)
	for key, cat := range categoryMap {
		if strings.Contains(importKeywordLower, key) && !seen[cat] {
			categories = append(categories, cat)
			seen[cat] = true
		}
	}

	// Then check the video's own keywords
	keywordsLower := strings.ToLower(keywords)
	for key, cat := range categoryMap {
		if strings.Contains(keywordsLower, key) && !seen[cat] {
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

// extractCategories extracts BDSM-related categories from keywords (legacy, uses new function)
func extractCategories(keywords string) []string {
	return extractCategoriesWithKeyword(keywords, "")
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
