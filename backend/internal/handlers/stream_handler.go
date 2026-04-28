package handlers

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
)

// streamURLCache caches resolved stream URLs so we don't hit Eporner on every page load.
type streamURLCache struct {
	mu    sync.RWMutex
	items map[string]streamCacheEntry
}

type streamCacheEntry struct {
	url       string
	expiresAt time.Time
}

var globalStreamCache = &streamURLCache{
	items: make(map[string]streamCacheEntry),
}

const streamCacheTTL = 6 * time.Hour

func (sc *streamURLCache) get(key string) (string, bool) {
	sc.mu.RLock()
	defer sc.mu.RUnlock()
	entry, ok := sc.items[key]
	if !ok || time.Now().After(entry.expiresAt) {
		return "", false
	}
	return entry.url, true
}

func (sc *streamURLCache) set(key, url string) {
	sc.mu.Lock()
	defer sc.mu.Unlock()
	sc.items[key] = streamCacheEntry{
		url:       url,
		expiresAt: time.Now().Add(streamCacheTTL),
	}
}

// hlsPattern matches the HLS m3u8 playlist URL embedded in Eporner's page JS.
// Eporner typically embeds it as: "hls":"https://...m3u8" or file: 'https://...m3u8'
var hlsPatterns = []*regexp.Regexp{
	regexp.MustCompile(`"hls"\s*:\s*"(https://[^"]+\.m3u8[^"]*)"`),
	regexp.MustCompile(`'hls'\s*:\s*'(https://[^']+\.m3u8[^']*)'`),
	regexp.MustCompile(`file\s*:\s*["'](https://[^"']+\.m3u8[^"']*)["']`),
	regexp.MustCompile(`src\s*:\s*["'](https://[^"']+\.m3u8[^"']*)["']`),
	regexp.MustCompile(`(https://[a-z0-9\-]+\.eporner\.com/[^"'\s]+\.m3u8[^"'\s]*)`),
	regexp.MustCompile(`(https://[a-z0-9\-]+\.gvideo\.[^"'\s]+\.m3u8[^"'\s]*)`),
}

// mp4Patterns matches fallback direct MP4 URLs
var mp4Patterns = []*regexp.Regexp{
	regexp.MustCompile(`"mp4"\s*:\s*\{[^}]*"(?:1080p|720p|480p|360p|240p)"\s*:\s*"(https://[^"]+\.mp4[^"]*)"`),
	regexp.MustCompile(`file\s*:\s*["'](https://[^"']+\.mp4[^"']*)["']`),
	regexp.MustCompile(`(https://[a-z0-9\-]+\.eporner\.com/[^"'\s]+\.mp4[^"'\s]*)`),
}

var streamHTTPClient = &http.Client{
	Timeout: 12 * time.Second,
	CheckRedirect: func(req *http.Request, via []*http.Request) error {
		if len(via) >= 5 {
			return http.ErrUseLastResponse
		}
		return nil
	},
}

// resolveEpornerStreamURL fetches the Eporner embed page and extracts the HLS URL.
func resolveEpornerStreamURL(ctx context.Context, externalID string) (string, string, error) {
	// Try the embed page first (smaller, faster)
	embedURL := fmt.Sprintf("https://www.eporner.com/embed/%s/", externalID)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, embedURL, nil)
	if err != nil {
		return "", "", fmt.Errorf("build request: %w", err)
	}

	// Mimic a real browser to avoid bot detection
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")
	req.Header.Set("Referer", "https://www.eporner.com/")

	resp, err := streamHTTPClient.Do(req)
	if err != nil {
		return "", "", fmt.Errorf("fetch embed page: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", "", fmt.Errorf("embed page returned %d", resp.StatusCode)
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, 2*1024*1024)) // 2 MB max
	if err != nil {
		return "", "", fmt.Errorf("read body: %w", err)
	}

	content := string(body)

	// Try HLS patterns first
	for _, pat := range hlsPatterns {
		if m := pat.FindStringSubmatch(content); len(m) > 1 {
			url := strings.TrimSpace(m[1])
			if url != "" {
				return url, "hls", nil
			}
		}
	}

	// Fallback: try MP4 patterns
	for _, pat := range mp4Patterns {
		if m := pat.FindStringSubmatch(content); len(m) > 1 {
			url := strings.TrimSpace(m[1])
			if url != "" {
				return url, "mp4", nil
			}
		}
	}

	return "", "", fmt.Errorf("no stream URL found in embed page")
}

// GetVideoStream handles GET /api/videos/:id/stream
// Returns the direct HLS (or MP4 fallback) URL for a video.
func (h *Handler) GetVideoStream(c *fiber.Ctx) error {
	video, err := h.resolveVideoIdentifier(c.Context(), c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch video",
		})
	}
	if video == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Video not found",
		})
	}

	if video.ExternalID == "" {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{
			"error": "Video has no external ID",
		})
	}

	cacheKey := "stream:v1:" + video.ExternalID

	// Check in-memory cache first
	if cached, ok := globalStreamCache.get(cacheKey); ok {
		streamType := "hls"
		if strings.HasSuffix(cached, ".mp4") {
			streamType = "mp4"
		}
		return c.JSON(fiber.Map{
			"url":         cached,
			"type":        streamType,
			"external_id": video.ExternalID,
			"cached":      true,
		})
	}

	// Resolve stream URL with a tight timeout — embed iframe is always the fallback
	ctx, cancel := context.WithTimeout(c.Context(), 8*time.Second)
	defer cancel()

	streamURL, streamType, resolveErr := resolveEpornerStreamURL(ctx, video.ExternalID)
	if resolveErr != nil {
		// Return the embed URL as fallback so the frontend can show an iframe
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error":     "stream_unavailable",
			"message":   resolveErr.Error(),
			"embed_url": video.EmbedURL,
		})
	}

	// Cache the resolved URL
	globalStreamCache.set(cacheKey, streamURL)

	return c.JSON(fiber.Map{
		"url":         streamURL,
		"type":        streamType,
		"external_id": video.ExternalID,
		"embed_url":   video.EmbedURL,
		"cached":      false,
	})
}
