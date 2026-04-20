package handlers

import (
	"context"
	"crypto/hmac"
	"crypto/subtle"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"

	"kinktube/internal/models"
)

const adminSessionCookieName = "kinktube_admin_session"

type adminLoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func (h *Handler) defaultSiteSettings() *models.SiteSettings {
	return models.DefaultSiteSettings(h.config)
}

func (h *Handler) applySiteSettings(settings *models.SiteSettings) {
	if settings == nil {
		return
	}

	h.importer.UpdateConfig(
		settings.Import.ImportMaxPages,
		settings.Import.LightImportMaxPages,
		settings.Import.LightImportKeywords,
	)
	h.affiliate.ApplySettings(settings.Affiliates)
}

func (h *Handler) getSiteSettings(ctx context.Context) (*models.SiteSettings, error) {
	return h.db.GetSiteSettings(ctx, h.defaultSiteSettings())
}

func (h *Handler) adminCredentialsConfigured() bool {
	return strings.TrimSpace(h.config.AdminAPIKey) != "" &&
		strings.TrimSpace(h.config.AdminUsername) != "" &&
		(strings.TrimSpace(h.config.AdminPassword) != "" || strings.TrimSpace(h.config.AdminPasswordHash) != "")
}

func (h *Handler) validateAdminAPIKey(c *fiber.Ctx) bool {
	adminAPIKey := strings.TrimSpace(h.config.AdminAPIKey)
	if adminAPIKey == "" {
		return false
	}

	providedKey := strings.TrimSpace(c.Get("X-Admin-Key"))
	if providedKey == "" {
		authHeader := strings.TrimSpace(c.Get("Authorization"))
		if strings.HasPrefix(strings.ToLower(authHeader), "bearer ") {
			providedKey = strings.TrimSpace(authHeader[7:])
		}
	}

	return subtle.ConstantTimeCompare([]byte(providedKey), []byte(adminAPIKey)) == 1
}

func (h *Handler) signAdminSession(username string, expiresAt int64) string {
	payload := fmt.Sprintf("%s|%d", username, expiresAt)
	mac := hmac.New(sha256.New, []byte(strings.TrimSpace(h.config.AdminAPIKey)))
	mac.Write([]byte(payload))
	signature := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	token := payload + "|" + signature
	return base64.RawURLEncoding.EncodeToString([]byte(token))
}

func (h *Handler) validateAdminSession(c *fiber.Ctx) bool {
	token := strings.TrimSpace(c.Cookies(adminSessionCookieName))
	if token == "" || strings.TrimSpace(h.config.AdminAPIKey) == "" {
		return false
	}

	raw, err := base64.RawURLEncoding.DecodeString(token)
	if err != nil {
		return false
	}

	parts := strings.Split(string(raw), "|")
	if len(parts) != 3 {
		return false
	}

	username := parts[0]
	expiresAt := parts[1]
	signature := parts[2]

	if subtle.ConstantTimeCompare([]byte(username), []byte(strings.TrimSpace(h.config.AdminUsername))) != 1 {
		return false
	}

	var expiry int64
	if _, err := fmt.Sscanf(expiresAt, "%d", &expiry); err != nil {
		return false
	}
	if time.Now().Unix() >= expiry {
		return false
	}

	expectedToken := h.signAdminSession(username, expiry)
	expectedRaw, err := base64.RawURLEncoding.DecodeString(expectedToken)
	if err != nil {
		return false
	}
	expectedParts := strings.Split(string(expectedRaw), "|")
	if len(expectedParts) != 3 {
		return false
	}

	return subtle.ConstantTimeCompare([]byte(signature), []byte(expectedParts[2])) == 1
}

func (h *Handler) setAdminSessionCookie(c *fiber.Ctx, username string) {
	expiry := time.Now().Add(24 * time.Hour)
	c.Cookie(&fiber.Cookie{
		Name:     adminSessionCookieName,
		Value:    h.signAdminSession(username, expiry.Unix()),
		Path:     "/api/admin",
		HTTPOnly: true,
		Secure:   strings.HasPrefix(strings.ToLower(strings.TrimSpace(h.config.SiteURL)), "https://"),
		SameSite: "Lax",
		Expires:  expiry,
	})
}

func (h *Handler) clearAdminSessionCookie(c *fiber.Ctx) {
	c.Cookie(&fiber.Cookie{
		Name:     adminSessionCookieName,
		Value:    "",
		Path:     "/api/admin",
		HTTPOnly: true,
		Expires:  time.Unix(0, 0),
		MaxAge:   -1,
	})
}

// RequireAdminAuth protects admin endpoints with a configured API key.
func (h *Handler) RequireAdminAuth(c *fiber.Ctx) error {
	adminAPIKey := strings.TrimSpace(h.config.AdminAPIKey)
	if adminAPIKey == "" {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error":   "Admin API disabled",
			"message": "Set ADMIN_API_KEY to enable admin endpoints",
		})
	}

	if !h.validateAdminAPIKey(c) && !h.validateAdminSession(c) {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":   "Unauthorized",
			"message": "Valid admin credentials are required",
		})
	}

	return c.Next()
}

func (h *Handler) GetAdminSession(c *fiber.Ctx) error {
	authenticated := h.validateAdminAPIKey(c) || h.validateAdminSession(c)

	return c.JSON(fiber.Map{
		"authenticated": authenticated,
		"username":      h.config.AdminUsername,
	})
}

func (h *Handler) LoginAdmin(c *fiber.Ctx) error {
	if !h.adminCredentialsConfigured() {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error":   "Admin login disabled",
			"message": "Set ADMIN_API_KEY plus ADMIN_USERNAME and ADMIN_PASSWORD or ADMIN_PASSWORD_HASH",
		})
	}

	var req adminLoginRequest
	if err := json.Unmarshal(c.Body(), &req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request payload",
		})
	}

	usernameMatches := subtle.ConstantTimeCompare(
		[]byte(strings.TrimSpace(req.Username)),
		[]byte(strings.TrimSpace(h.config.AdminUsername)),
	) == 1
	if !usernameMatches {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":   "Unauthorized",
			"message": "Invalid username or password",
		})
	}

	passwordMatches := false
	adminPasswordHash := strings.TrimSpace(h.config.AdminPasswordHash)
	if adminPasswordHash != "" {
		passwordMatches = bcrypt.CompareHashAndPassword([]byte(adminPasswordHash), []byte(req.Password)) == nil
	} else {
		passwordMatches = subtle.ConstantTimeCompare(
			[]byte(req.Password),
			[]byte(h.config.AdminPassword),
		) == 1
	}

	if !passwordMatches {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":   "Unauthorized",
			"message": "Invalid username or password",
		})
	}

	h.setAdminSessionCookie(c, h.config.AdminUsername)

	return c.JSON(fiber.Map{
		"authenticated": true,
		"username":      h.config.AdminUsername,
	})
}

func (h *Handler) LogoutAdmin(c *fiber.Ctx) error {
	h.clearAdminSessionCookie(c)
	return c.JSON(fiber.Map{"ok": true})
}
