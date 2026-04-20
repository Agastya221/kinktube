package models

import (
	"os"
	"strings"

	"kinktube/internal/config"
)

// SiteSettings contains runtime-configurable settings managed from the admin console.
type SiteSettings struct {
	Branding   BrandingSettings  `json:"branding"`
	Theme      ThemeSettings     `json:"theme"`
	SEO        SEOSettings       `json:"seo"`
	Content    ContentSettings   `json:"content"`
	Ads        AdSettings        `json:"ads"`
	Affiliates AffiliateSettings `json:"affiliates"`
	Legal      LegalSettings     `json:"legal"`
	Import     ImportSettings    `json:"import"`
}

type BrandingSettings struct {
	SiteName          string `json:"site_name"`
	LogoPrimary       string `json:"logo_primary"`
	LogoSecondary     string `json:"logo_secondary"`
	SiteTagline       string `json:"site_tagline"`
	HeroAccent        string `json:"hero_accent"`
	HeroTitle         string `json:"hero_title"`
	HeroDescription   string `json:"hero_description"`
	FooterDescription string `json:"footer_description"`
	CopyrightLabel    string `json:"copyright_label"`
}

type ThemeSettings struct {
	Background          string `json:"background"`
	BackgroundSecondary string `json:"background_secondary"`
	BackgroundTertiary  string `json:"background_tertiary"`
	Foreground          string `json:"foreground"`
	ForegroundMuted     string `json:"foreground_muted"`
	Accent              string `json:"accent"`
	AccentHover         string `json:"accent_hover"`
	AccentLight         string `json:"accent_light"`
	Border              string `json:"border"`
	BorderHover         string `json:"border_hover"`
}

type SEOSettings struct {
	SiteURL              string   `json:"site_url"`
	DefaultTitle         string   `json:"default_title"`
	TitleTemplate        string   `json:"title_template"`
	DefaultDescription   string   `json:"default_description"`
	DefaultKeywords      []string `json:"default_keywords"`
	OpenGraphTitle       string   `json:"open_graph_title"`
	OpenGraphDescription string   `json:"open_graph_description"`
	TwitterTitle         string   `json:"twitter_title"`
	TwitterDescription   string   `json:"twitter_description"`
}

type ContentSettings struct {
	VideosPerPage     int    `json:"videos_per_page"`
	RelatedVideos     int    `json:"related_videos"`
	ShowDisclaimer    bool   `json:"show_disclaimer"`
	DisclaimerText    string `json:"disclaimer_text"`
	EnableAgeGate     bool   `json:"enable_age_gate"`
	EnablePopunderAds bool   `json:"enable_popunder_ads"`
}

type AdSlotSettings struct {
	Enabled bool   `json:"enabled"`
	ZoneID  string `json:"zone_id"`
	Label   string `json:"label"`
}

type AdSettings struct {
	Network     string         `json:"network"`
	Banner      AdSlotSettings `json:"banner"`
	Sidebar     AdSlotSettings `json:"sidebar"`
	Native      AdSlotSettings `json:"native"`
	Popunder    AdSlotSettings `json:"popunder"`
	VideoBanner AdSlotSettings `json:"video_banner"`
	MobileBanner AdSlotSettings `json:"mobile_banner"`
}

type AffiliateSettings struct {
	KinkyDollarsID  string `json:"kinkydollars_id"`
	ClubDomCashID   string `json:"clubdomcash_id"`
	FemdomEmpireID  string `json:"femdomempire_id"`
	DeviceBondageID string `json:"devicebondage_id"`
	HogtiedID       string `json:"hogtied_id"`
	WhippedAssID    string `json:"whippedass_id"`
	SadisticRopeID  string `json:"sadisticrope_id"`
	DefaultID       string `json:"default_id"`
}

type LegalDocumentSettings struct {
	Title   string `json:"title"`
	Content string `json:"content"`
}

type LegalSettings struct {
	Terms          LegalDocumentSettings `json:"terms"`
	Privacy        LegalDocumentSettings `json:"privacy"`
	DMCA           LegalDocumentSettings `json:"dmca"`
	Compliance2257 LegalDocumentSettings `json:"compliance_2257"`
}

type ImportSettings struct {
	ImportEnabled       bool `json:"import_enabled"`
	ImportMaxPages      int  `json:"import_max_pages"`
	LightImportMaxPages int  `json:"light_import_max_pages"`
	LightImportKeywords int  `json:"light_import_keywords"`
}

type PublicSiteSettings struct {
	Branding BrandingSettings `json:"branding"`
	Theme    ThemeSettings    `json:"theme"`
	SEO      SEOSettings      `json:"seo"`
	Content  ContentSettings  `json:"content"`
	Ads      AdSettings       `json:"ads"`
	Legal    LegalSettings    `json:"legal"`
}

func (s *SiteSettings) Public() *PublicSiteSettings {
	if s == nil {
		return nil
	}

	return &PublicSiteSettings{
		Branding: s.Branding,
		Theme:    s.Theme,
		SEO:      s.SEO,
		Content:  s.Content,
		Ads:      s.Ads,
		Legal:    s.Legal,
	}
}

func DefaultSiteSettings(cfg *config.Config) *SiteSettings {
	siteURL := strings.TrimSpace(cfg.SiteURL)
	if siteURL == "" {
		siteURL = "https://yourdomain.com"
	}

	settings := &SiteSettings{
		Branding: BrandingSettings{
			SiteName:          "KinkTube",
			LogoPrimary:       "Kink",
			LogoSecondary:     "Tube",
			SiteTagline:       "The underground destination for extreme BDSM, hardcore femdom, intense bondage, and severe fetish content.",
			HeroAccent:        "Extreme",
			HeroTitle:         "BDSM & Hardcore Fetish",
			HeroDescription:   "Dive into intense femdom, predicament bondage, severe discipline, mummification, and hardcore fetish scenes. Curated for serious kink enthusiasts. Not your average tube site.",
			FooterDescription: "The premier destination for BDSM, kink, and fetish video content. All videos are embedded from external sources.",
			CopyrightLabel:    "KinkTube",
		},
		Theme: ThemeSettings{
			Background:          "#0a0a0a",
			BackgroundSecondary: "#111111",
			BackgroundTertiary:  "#1a1a1a",
			Foreground:          "#fafafa",
			ForegroundMuted:     "#a1a1aa",
			Accent:              "#dc2626",
			AccentHover:         "#b91c1c",
			AccentLight:         "#ef4444",
			Border:              "#27272a",
			BorderHover:         "#3f3f46",
		},
		SEO: SEOSettings{
			SiteURL:              siteURL,
			DefaultTitle:         "KinkTube - Extreme BDSM & Hardcore Fetish Videos",
			TitleTemplate:        "%s | KinkTube",
			DefaultDescription:   "The underground destination for extreme BDSM, hardcore femdom, intense bondage, and severe fetish content. Explore mummification, predicament bondage, brutal discipline, and more. 100% free.",
			DefaultKeywords:      []string{"extreme BDSM", "hardcore femdom", "intense bondage", "severe discipline", "predicament bondage", "mummification", "bondage", "femdom", "kink", "fetish"},
			OpenGraphTitle:       "KinkTube - Extreme BDSM & Hardcore Fetish Videos",
			OpenGraphDescription: "The underground destination for extreme BDSM, hardcore femdom, intense bondage, and severe fetish content.",
			TwitterTitle:         "KinkTube - Extreme BDSM & Hardcore Fetish Videos",
			TwitterDescription:   "The underground destination for extreme BDSM, hardcore femdom, intense bondage, and severe fetish content.",
		},
		Content: ContentSettings{
			VideosPerPage:     24,
			RelatedVideos:     24,
			ShowDisclaimer:    true,
			DisclaimerText:    "This site contains adult content. All performers are 18+. We do not host any videos - all content is embedded from third-party sources.",
			EnableAgeGate:     true,
			EnablePopunderAds: true,
		},
		Ads: AdSettings{
			Network: strings.TrimSpace(envOrDefault("NEXT_PUBLIC_AD_NETWORK", "exoclick")),
			Banner: AdSlotSettings{
				Enabled: strings.TrimSpace(os.Getenv("NEXT_PUBLIC_AD_ZONE_BANNER")) != "",
				ZoneID:  strings.TrimSpace(os.Getenv("NEXT_PUBLIC_AD_ZONE_BANNER")),
				Label:   "Top / Bottom Banner",
			},
			Sidebar: AdSlotSettings{
				Enabled: strings.TrimSpace(os.Getenv("NEXT_PUBLIC_AD_ZONE_SIDEBAR")) != "",
				ZoneID:  strings.TrimSpace(os.Getenv("NEXT_PUBLIC_AD_ZONE_SIDEBAR")),
				Label:   "Sidebar",
			},
			Native: AdSlotSettings{
				Enabled: strings.TrimSpace(os.Getenv("NEXT_PUBLIC_AD_ZONE_NATIVE")) != "",
				ZoneID:  strings.TrimSpace(os.Getenv("NEXT_PUBLIC_AD_ZONE_NATIVE")),
				Label:   "Native Sponsored Block",
			},
			Popunder: AdSlotSettings{
				Enabled: strings.TrimSpace(os.Getenv("NEXT_PUBLIC_AD_ZONE_POPUNDER")) != "",
				ZoneID:  strings.TrimSpace(os.Getenv("NEXT_PUBLIC_AD_ZONE_POPUNDER")),
				Label:   "Popunder",
			},
			VideoBanner: AdSlotSettings{
				Enabled: strings.TrimSpace(os.Getenv("NEXT_PUBLIC_AD_ZONE_VIDEO_BANNER")) != "",
				ZoneID:  strings.TrimSpace(os.Getenv("NEXT_PUBLIC_AD_ZONE_VIDEO_BANNER")),
				Label:   "Video Page Banner",
			},
			MobileBanner: AdSlotSettings{
				Enabled: strings.TrimSpace(os.Getenv("NEXT_PUBLIC_AD_ZONE_MOBILE_BANNER")) != "",
				ZoneID:  strings.TrimSpace(os.Getenv("NEXT_PUBLIC_AD_ZONE_MOBILE_BANNER")),
				Label:   "Mobile Banner",
			},
		},
		Affiliates: AffiliateSettings{
			KinkyDollarsID:  strings.TrimSpace(os.Getenv("AFFILIATE_KINKYDOLLARS_ID")),
			ClubDomCashID:   strings.TrimSpace(os.Getenv("AFFILIATE_CLUBDOMCASH_ID")),
			FemdomEmpireID:  strings.TrimSpace(os.Getenv("AFFILIATE_FEMDOMEMPIRE_ID")),
			DeviceBondageID: strings.TrimSpace(os.Getenv("AFFILIATE_DEVICEBONDAGE_ID")),
			HogtiedID:       strings.TrimSpace(os.Getenv("AFFILIATE_HOGTIED_ID")),
			WhippedAssID:    strings.TrimSpace(os.Getenv("AFFILIATE_WHIPPEDASS_ID")),
			SadisticRopeID:  strings.TrimSpace(os.Getenv("AFFILIATE_SADISTICROPE_ID")),
			DefaultID:       strings.TrimSpace(envOrDefault("AFFILIATE_DEFAULT_ID", "default")),
		},
		Legal: defaultLegalSettings(),
		Import: ImportSettings{
			ImportEnabled:       cfg.ImportEnabled,
			ImportMaxPages:      cfg.ImportMaxPages,
			LightImportMaxPages: cfg.LightImportMaxPages,
			LightImportKeywords: cfg.LightImportKeywords,
		},
	}

	NormalizeSiteSettings(settings)
	return settings
}

func NormalizeSiteSettings(settings *SiteSettings) {
	if settings == nil {
		return
	}

	if settings.Content.VideosPerPage < 12 {
		settings.Content.VideosPerPage = 12
	}
	if settings.Content.VideosPerPage > 48 {
		settings.Content.VideosPerPage = 48
	}
	if settings.Content.RelatedVideos < 6 {
		settings.Content.RelatedVideos = 6
	}
	if settings.Content.RelatedVideos > 36 {
		settings.Content.RelatedVideos = 36
	}
	if settings.Import.ImportMaxPages < 1 {
		settings.Import.ImportMaxPages = 1
	}
	if settings.Import.LightImportMaxPages < 1 {
		settings.Import.LightImportMaxPages = 1
	}
	if settings.Import.LightImportKeywords < 1 {
		settings.Import.LightImportKeywords = 1
	}

	if strings.TrimSpace(settings.Branding.SiteName) == "" {
		settings.Branding.SiteName = "KinkTube"
	}
	if strings.TrimSpace(settings.Branding.LogoPrimary) == "" {
		settings.Branding.LogoPrimary = "Kink"
	}
	if strings.TrimSpace(settings.Branding.LogoSecondary) == "" {
		settings.Branding.LogoSecondary = "Tube"
	}
	if strings.TrimSpace(settings.Branding.CopyrightLabel) == "" {
		settings.Branding.CopyrightLabel = settings.Branding.SiteName
	}

	if strings.TrimSpace(settings.SEO.SiteURL) == "" {
		settings.SEO.SiteURL = "https://yourdomain.com"
	}
	if strings.TrimSpace(settings.Ads.Network) == "" {
		settings.Ads.Network = "exoclick"
	}
}

func defaultLegalSettings() LegalSettings {
	return LegalSettings{
		Terms: LegalDocumentSettings{
			Title: "Terms of Service",
			Content: `By accessing and using this site, you agree to be bound by these terms.

This website contains adult material and is intended only for adults who are at least 18 years old or the age of majority in their jurisdiction.

We do not host video files. All videos displayed on the site are embedded from third-party sources.

You agree not to use this site to violate any applicable laws, facilitate access for minors, attempt unauthorized access, or disrupt service.

We may update these terms at any time. Continued use of the site constitutes acceptance of any changes.`,
		},
		Privacy: LegalDocumentSettings{
			Title: "Privacy Policy",
			Content: `We collect limited information required to operate and improve the service, including basic usage data, device information, and cookies.

Cookies are used for age verification and basic preferences. Third-party video providers, advertisers, and analytics vendors may set their own cookies.

This website is intended only for adults. We do not knowingly collect data from minors.

We may update this policy from time to time. Continued use of the site after changes means you accept the updated policy.`,
		},
		DMCA: LegalDocumentSettings{
			Title: "DMCA Notice & Takedown Policy",
			Content: `This site respects the intellectual property rights of others and responds to valid takedown notices.

We do not host video files. All videos are embedded from third-party platforms. If you need actual source content removed, you must also contact the original host.

To request removal from our index, send the copyrighted work information, the URL on our site, your contact details, a good-faith statement, and an authorized signature.

Please include "DMCA Takedown Request" in the subject line of your notice.`,
		},
		Compliance2257: LegalDocumentSettings{
			Title: "18 U.S.C. 2257 Compliance Statement",
			Content: `This site is not a producer, primary or secondary, of any depictions found here.

We do not host, upload, or produce video content. All videos displayed are embedded from third-party websites using their official embed codes.

All record-keeping requests under 18 U.S.C. 2257 should be directed to the original producers and hosting platforms responsible for the content.`,
		},
	}
}

func envOrDefault(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}
