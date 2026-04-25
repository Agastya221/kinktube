package handlers

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

const (
	thumbnailProxyCacheTTL = 7 * 24 * time.Hour
	thumbnailProxyMaxBytes = 8 * 1024 * 1024
)

var thumbnailProxyHTTPClient = &http.Client{
	Timeout: 8 * time.Second,
	CheckRedirect: func(req *http.Request, via []*http.Request) error {
		if len(via) >= 3 {
			return http.ErrUseLastResponse
		}
		if !isAllowedThumbnailURL(req.URL) {
			return http.ErrUseLastResponse
		}
		return nil
	},
}

type cachedThumbnailProxyResponse struct {
	ContentType string `json:"content_type"`
	Body        []byte `json:"body"`
}

// ProxyThumbnail fetches allowlisted third-party thumbnails from the backend
// region so clients in regions where image hosts are slow or blocked can still
// render the page quickly. It is intentionally restricted to images only.
func (h *Handler) ProxyThumbnail(c *fiber.Ctx) error {
	rawURL := strings.TrimSpace(c.Query("url"))
	if rawURL == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "missing url"})
	}

	targetURL, err := url.Parse(rawURL)
	if err != nil || !isAllowedThumbnailURL(targetURL) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "unsupported thumbnail url"})
	}

	ctx, cancel := context.WithTimeout(c.UserContext(), 9*time.Second)
	defer cancel()

	cacheKey := thumbnailProxyCacheKey(targetURL.String())
	if h.cache != nil {
		var cached cachedThumbnailProxyResponse
		if err := h.cache.Get(ctx, cacheKey, &cached); err == nil && len(cached.Body) > 0 {
			setThumbnailProxyHeaders(c, cached.ContentType, true)
			return c.Send(cached.Body)
		}
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, targetURL.String(), nil)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid thumbnail url"})
	}
	req.Header.Set("Accept", "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8")
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; KinkTubeThumbnailProxy/1.0)")

	resp, err := thumbnailProxyHTTPClient.Do(req)
	if err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": "thumbnail host unavailable"})
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": "thumbnail fetch failed"})
	}

	contentType := strings.ToLower(strings.TrimSpace(resp.Header.Get("Content-Type")))
	if !strings.HasPrefix(contentType, "image/") {
		return c.Status(fiber.StatusUnsupportedMediaType).JSON(fiber.Map{"error": "upstream response is not an image"})
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, thumbnailProxyMaxBytes+1))
	if err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": "thumbnail read failed"})
	}
	if len(body) > thumbnailProxyMaxBytes {
		return c.Status(fiber.StatusRequestEntityTooLarge).JSON(fiber.Map{"error": "thumbnail too large"})
	}

	if h.cache != nil {
		_ = h.cache.SetWithTTL(ctx, cacheKey, cachedThumbnailProxyResponse{
			ContentType: contentType,
			Body:        body,
		}, thumbnailProxyCacheTTL)
	}

	setThumbnailProxyHeaders(c, contentType, false)
	return c.Send(body)
}

func setThumbnailProxyHeaders(c *fiber.Ctx, contentType string, cacheHit bool) {
	if contentType == "" {
		contentType = "image/jpeg"
	}
	c.Set(fiber.HeaderContentType, contentType)
	c.Set(fiber.HeaderCacheControl, "public, max-age=86400, stale-while-revalidate=604800")
	c.Set("X-Content-Type-Options", "nosniff")
	if cacheHit {
		c.Set("X-Thumbnail-Proxy-Cache", "hit")
		return
	}
	c.Set("X-Thumbnail-Proxy-Cache", "miss")
}

func thumbnailProxyCacheKey(rawURL string) string {
	sum := sha256.Sum256([]byte(rawURL))
	return "media:thumbnail:v1:" + hex.EncodeToString(sum[:])
}

func isAllowedThumbnailURL(u *url.URL) bool {
	if u == nil {
		return false
	}
	if u.Scheme != "https" {
		return false
	}
	if u.User != nil {
		return false
	}

	host := strings.ToLower(strings.TrimSuffix(u.Hostname(), "."))
	if host == "" {
		return false
	}
	if ip := net.ParseIP(host); ip != nil {
		return false
	}

	return host == "eporner.com" || strings.HasSuffix(host, ".eporner.com")
}
