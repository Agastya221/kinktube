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
	Network      string         `json:"network"`
	Banner       AdSlotSettings `json:"banner"`
	Sidebar      AdSlotSettings `json:"sidebar"`
	Native       AdSlotSettings `json:"native"`
	Popunder     AdSlotSettings `json:"popunder"`
	VideoBanner  AdSlotSettings `json:"video_banner"`
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
	Terms             LegalDocumentSettings `json:"terms"`
	Privacy           LegalDocumentSettings `json:"privacy"`
	DMCA              LegalDocumentSettings `json:"dmca"`
	Compliance2257    LegalDocumentSettings `json:"compliance_2257"`
	AcceptableContent LegalDocumentSettings `json:"acceptable_content"`
	ContentRemoval    LegalDocumentSettings `json:"content_removal"`
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

	normalizeLegalSettings(settings)
}

func ApplyAdEnvDefaults(settings *SiteSettings) {
	if settings == nil {
		return
	}

	hasConfiguredAds := hasConfiguredAdSlot(settings)
	network := strings.TrimSpace(os.Getenv("NEXT_PUBLIC_AD_NETWORK"))
	if network != "" && (strings.TrimSpace(settings.Ads.Network) == "" || !hasConfiguredAds) {
		settings.Ads.Network = network
	}

	applyAdSlotEnvDefault(&settings.Ads.Banner, "NEXT_PUBLIC_AD_ZONE_BANNER")
	applyAdSlotEnvDefault(&settings.Ads.Sidebar, "NEXT_PUBLIC_AD_ZONE_SIDEBAR")
	applyAdSlotEnvDefault(&settings.Ads.Native, "NEXT_PUBLIC_AD_ZONE_NATIVE")
	applyAdSlotEnvDefault(&settings.Ads.Popunder, "NEXT_PUBLIC_AD_ZONE_POPUNDER")
	applyAdSlotEnvDefault(&settings.Ads.VideoBanner, "NEXT_PUBLIC_AD_ZONE_VIDEO_BANNER")
	applyAdSlotEnvDefault(&settings.Ads.MobileBanner, "NEXT_PUBLIC_AD_ZONE_MOBILE_BANNER")
}

func hasConfiguredAdSlot(settings *SiteSettings) bool {
	return strings.TrimSpace(settings.Ads.Banner.ZoneID) != "" ||
		strings.TrimSpace(settings.Ads.Sidebar.ZoneID) != "" ||
		strings.TrimSpace(settings.Ads.Native.ZoneID) != "" ||
		strings.TrimSpace(settings.Ads.Popunder.ZoneID) != "" ||
		strings.TrimSpace(settings.Ads.VideoBanner.ZoneID) != "" ||
		strings.TrimSpace(settings.Ads.MobileBanner.ZoneID) != ""
}

func applyAdSlotEnvDefault(slot *AdSlotSettings, envKey string) {
	value := strings.TrimSpace(os.Getenv(envKey))
	if value == "" || strings.TrimSpace(slot.ZoneID) != "" {
		return
	}

	slot.ZoneID = value
	slot.Enabled = true
}

func defaultLegalSettings() LegalSettings {
	return LegalSettings{
		Terms: LegalDocumentSettings{
			Title:   "Terms of Service",
			Content: defaultTermsContent(),
		},
		Privacy: LegalDocumentSettings{
			Title:   "Privacy Policy",
			Content: defaultPrivacyContent(),
		},
		DMCA: LegalDocumentSettings{
			Title:   "DMCA Notice & Takedown Policy",
			Content: defaultDMCAContent(),
		},
		Compliance2257: LegalDocumentSettings{
			Title:   "18 U.S.C. 2257 Compliance Statement",
			Content: default2257Content(),
		},
		AcceptableContent: LegalDocumentSettings{
			Title:   "Acceptable Content Policy",
			Content: defaultAcceptableContentPolicy(),
		},
		ContentRemoval: LegalDocumentSettings{
			Title:   "Content Removal Policy",
			Content: defaultContentRemovalPolicy(),
		},
	}
}

func normalizeLegalSettings(settings *SiteSettings) {
	defaults := defaultLegalSettings()

	normalizeLegalDocument(&settings.Legal.Terms, defaults.Terms, oldDefaultTermsContent())
	normalizeLegalDocument(&settings.Legal.Privacy, defaults.Privacy, oldDefaultPrivacyContent())
	normalizeLegalDocument(&settings.Legal.DMCA, defaults.DMCA, oldDefaultDMCAContent())
	normalizeLegalDocument(&settings.Legal.Compliance2257, defaults.Compliance2257, oldDefault2257Content())
	normalizeLegalDocument(&settings.Legal.AcceptableContent, defaults.AcceptableContent, "")
	normalizeLegalDocument(&settings.Legal.ContentRemoval, defaults.ContentRemoval, "")
}

func normalizeLegalDocument(doc *LegalDocumentSettings, fallback LegalDocumentSettings, legacyContent string) {
	if strings.TrimSpace(doc.Title) == "" {
		doc.Title = fallback.Title
	}

	content := strings.TrimSpace(doc.Content)
	if content == "" || strings.Contains(content, "@yourdomain.com") || (legacyContent != "" && content == strings.TrimSpace(legacyContent)) {
		doc.Content = fallback.Content
	}
}

func oldDefaultTermsContent() string {
	return `By accessing and using this site, you agree to be bound by these terms.

This website contains adult material and is intended only for adults who are at least 18 years old or the age of majority in their jurisdiction.

We do not host video files. All videos displayed on the site are embedded from third-party sources.

You agree not to use this site to violate any applicable laws, facilitate access for minors, attempt unauthorized access, or disrupt service.

We may update these terms at any time. Continued use of the site constitutes acceptance of any changes.`
}

func oldDefaultPrivacyContent() string {
	return `We collect limited information required to operate and improve the service, including basic usage data, device information, and cookies.

Cookies are used for age verification and basic preferences. Third-party video providers, advertisers, and analytics vendors may set their own cookies.

This website is intended only for adults. We do not knowingly collect data from minors.

We may update this policy from time to time. Continued use of the site after changes means you accept the updated policy.`
}

func oldDefaultDMCAContent() string {
	return `This site respects the intellectual property rights of others and responds to valid takedown notices.

We do not host video files. All videos are embedded from third-party platforms. If you need actual source content removed, you must also contact the original host.

To request removal from our index, send the copyrighted work information, the URL on our site, your contact details, a good-faith statement, and an authorized signature.

Please include "DMCA Takedown Request" in the subject line of your notice.`
}

func oldDefault2257Content() string {
	return `This site is not a producer, primary or secondary, of any depictions found here.

We do not host, upload, or produce video content. All videos displayed are embedded from third-party websites using their official embed codes.

All record-keeping requests under 18 U.S.C. 2257 should be directed to the original producers and hosting platforms responsible for the content.`
}

func defaultTermsContent() string {
	return `Last updated: April 26, 2026

These Terms of Service govern your access to and use of KinkTube. By visiting or using this site, you agree to these terms. If you do not agree, do not use the site.

Adult-only access

KinkTube contains adult material. You must be at least 18 years old and the age of majority in your jurisdiction to access this site. You represent that you are legally permitted to view adult content and that you will not allow minors to access the site.

What KinkTube provides

KinkTube is an adult video discovery and embed site. We use the Eporner API and related third-party metadata to list, organize, search, and embed videos from third-party platforms. We do not upload, produce, sell, or host the underlying video files. Video playback, thumbnails, source pages, and some metadata may be supplied by Eporner or other third-party services.

Third-party content and links

Videos and outbound links may take you to websites that we do not own or control. Those third-party sites are responsible for their own content, privacy practices, terms, performer records, and removal processes. We may remove links or embeds from KinkTube, but removal from this site does not remove source content from Eporner or the original host.

Acceptable use

You agree not to use KinkTube to:

- access the site if you are underage or prohibited from viewing adult content;
- scrape, clone, overload, interfere with, or reverse engineer the site;
- bypass security, age gates, rate limits, or access controls;
- use the site for unlawful, abusive, harassing, exploitative, or non-consensual activity;
- submit false, abusive, automated, or bad-faith reports;
- infringe copyrights, trademarks, privacy rights, publicity rights, or any other legal rights.

Content standards

We have zero tolerance for child sexual abuse material, child sexual exploitation material, non-consensual intimate content, trafficking, coercion, bestiality, real violence, malware, scams, or content that appears to violate applicable law. More detail is provided in our Acceptable Content Policy.

Removal requests and copyright complaints

If you believe a listing, thumbnail, title, embed, or link on KinkTube violates your rights or our content standards, use the Contact page or the form on the Content Removal page. Copyright complaints should include the information required by the DMCA Policy.

No warranties

KinkTube is provided as-is and as-available. We do not guarantee that the site will be uninterrupted, error-free, complete, accurate, secure, or available in every location.

Limitation of liability

To the fullest extent permitted by law, KinkTube and its operators will not be liable for indirect, incidental, consequential, special, punitive, or lost-profit damages arising from your use of the site or from third-party content linked or embedded through the site.

Changes

We may update these terms at any time. The updated version becomes effective when posted. Continued use of the site means you accept the updated terms.

Contact

Questions about these terms may be submitted through the Contact page.`
}

func defaultPrivacyContent() string {
	return `Last updated: April 26, 2026

This Privacy Policy explains how KinkTube handles information when you visit or use the site.

Summary

KinkTube is an adult video discovery and embed site using third-party video data and embeds, including from the Eporner API. We collect limited information needed to operate the site, protect it from abuse, remember basic preferences such as age-gate acceptance, measure performance, and respond to reports or legal requests.

Information we may collect

We may process:

- basic technical data such as IP address, browser type, device type, operating system, referring page, page URLs, approximate location derived from IP address, request times, and error logs;
- usage data such as searches, pages viewed, video pages opened, categories browsed, and interactions with site controls;
- cookies or local storage values for age verification, preferences, analytics, security, and advertising;
- contact information and message contents if you submit a report or contact form;
- DMCA, content removal, legal, or abuse-report information that you voluntarily provide.

How we use information

We use information to:

- operate, maintain, secure, and debug the site;
- show embedded third-party videos and related metadata;
- remember age-gate and preference choices;
- analyze traffic and improve performance;
- detect spam, automated abuse, security threats, and policy violations;
- process privacy, copyright, DMCA, content removal, and legal requests;
- comply with applicable law.

Cookies, analytics, ads, and embeds

KinkTube may use cookies, local storage, analytics tools, ad networks, CDN/security providers, and embedded video players. Third parties such as Eporner, analytics providers, advertising networks, and infrastructure providers may receive technical information when their resources load in your browser. Their privacy policies govern their own processing.

Adult content and age gate

This site is for adults only. We may store an age-gate confirmation cookie or local storage value so you do not have to confirm on every page. Do not use this site if you are under the age of majority in your jurisdiction.

Legal bases

Where privacy laws such as the GDPR apply, we process information based on legitimate interests, consent where required, performance of requested services, legal obligations, and protection against abuse or illegal activity.

Sharing information

We may share information with service providers that help us host, secure, analyze, advertise, and operate the site. We may also disclose information when required by law, to protect rights and safety, to investigate abuse, or in connection with a business transfer.

Retention

We keep information only as long as reasonably needed for the purposes described above. Routine technical logs are generally kept for a limited period. Legal, DMCA, abuse, and content-removal correspondence may be retained longer when needed to document actions taken or comply with legal obligations.

Your choices

You can block or delete cookies in your browser. Some site features may work less smoothly if cookies or local storage are disabled. You may also contact us to request access, correction, deletion, restriction, objection, or portability where those rights apply.

Children and minors

KinkTube is not directed to minors and does not knowingly collect personal information from minors. If you believe a minor has provided information to us or appears in content linked from this site, contact us immediately.

Security

We use reasonable technical and organizational measures to protect information, but no website or internet transmission is completely secure.

International access

The site may be accessed from many countries, and our service providers may process information in different jurisdictions. By using the site, you understand that information may be processed outside your country.

Contact

Privacy questions and requests may be submitted through the Contact page.`
}

func defaultDMCAContent() string {
	return `Last updated: April 26, 2026

KinkTube respects copyright owners and responds to valid notices under the Digital Millennium Copyright Act.

Important hosting note

KinkTube does not host the underlying video files. We use third-party embeds and metadata, including content made available through the Eporner API. A valid notice can result in removal or disabling of the relevant listing, thumbnail, embed, or link from KinkTube. It will not remove the original video from Eporner or any third-party host. For source-file removal, you should also contact Eporner or the original hosting platform.

Submitting a DMCA notice

To request removal from KinkTube, submit a DMCA report through the Contact page or the form on the Content Removal page with:

- your physical or electronic signature;
- identification of the copyrighted work claimed to be infringed;
- the exact KinkTube URL or URLs where the allegedly infringing listing, embed, thumbnail, or link appears;
- if available, the Eporner/source URL or other source-host URL;
- your name and reliable reply contact information;
- a statement that you have a good-faith belief that use of the material is not authorized by the copyright owner, its agent, or the law;
- a statement, under penalty of perjury, that the information in the notice is accurate and that you are the copyright owner or authorized to act for the owner.

Counter-notices

If you believe material was removed or disabled because of mistake or misidentification, you may submit a counter-notice through the Contact page containing:

- your physical or electronic signature;
- identification of the material removed or disabled and where it appeared before removal;
- a statement, under penalty of perjury, that you have a good-faith belief the material was removed or disabled because of mistake or misidentification;
- your name and reliable reply contact information;
- a statement that you consent to the jurisdiction of the appropriate federal court and will accept service of process from the original complainant or their agent.

Repeat infringement and abuse

We may remove listings, disable access, block repeat infringers, and reject abusive or fraudulent notices. Misrepresenting infringement may create legal liability.

Processing time

We review notices as promptly as practical. Incomplete notices may delay or prevent action.

Contact

DMCA notices should be submitted through the Contact page or the Content Removal form.`
}

func default2257Content() string {
	return `Last updated: April 26, 2026

KinkTube is an adult video discovery and embed site. We do not produce, upload, host, or sell the visual depictions displayed through embedded third-party players.

The videos indexed or embedded on KinkTube are supplied by third-party platforms and metadata sources, including the Eporner API. KinkTube is not the primary or secondary producer of those visual depictions as those terms are used in 18 U.S.C. 2257, 18 U.S.C. 2257A, or 28 C.F.R. Part 75.

Any records required by 18 U.S.C. 2257 or related regulations should be maintained by the original producer, publisher, or hosting platform responsible for the content.

If you believe a listing on KinkTube contains unlawful material, depicts a minor, lacks required consent, or should be removed, submit a report immediately through the Content Removal form with the exact KinkTube URL and any source URL you can provide.`
}

func defaultAcceptableContentPolicy() string {
	return `Last updated: April 26, 2026

KinkTube is intended to index and embed lawful adult content from third-party sources. This policy explains the types of content we will not knowingly list, promote, embed, or link to.

Zero tolerance

We have zero tolerance for child sexual abuse material, child sexual exploitation material, or any content involving a person who is, appears to be, or is represented as under 18 years old. This applies to real, simulated, animated, AI-generated, textual, thumbnail, title, tag, and metadata content.

Prohibited content

KinkTube will not knowingly list, embed, or link to content that includes or promotes:

- minors, child sexual abuse, child exploitation, grooming, or sexualized age-play involving minors;
- non-consensual intimate content, revenge porn, hidden-camera content, coerced content, blackmail, trafficking, exploitation, or content where consent appears absent or invalid;
- deepfakes, impersonation, or AI-generated sexual content involving a real person without consent;
- real violence, real injury, real sexual assault, or content that appears to show actual harm rather than consensual fantasy roleplay;
- bestiality or sexual content involving animals;
- malware, phishing, scams, deceptive payment offers, or other abusive technical behavior;
- stolen, pirated, or unauthorized copyrighted material;
- content that unlawfully exposes personal data or encourages harassment, stalking, threats, or abuse;
- terrorism, hate offenses, illegal weapons sales, or other criminal activity;
- content that violates applicable law or the rules of a source platform such as Eporner.

BDSM and fantasy content

KinkTube focuses on BDSM and fetish material. Consensual fantasy, roleplay, discipline, restraint, dominance, submission, and similar adult themes may appear on the site. That does not permit content involving minors, real coercion, lack of consent, real injury, trafficking, or illegal activity.

Third-party source material

Because KinkTube uses third-party embeds and Eporner API metadata, we may not control the original upload. When we identify a violation, we can remove or disable the listing, embed, thumbnail, title, tag, or link from KinkTube. Source-file removal must be handled by Eporner or the original host.

Reports

If you believe content violates this policy, submit a report through the Contact page or Content Removal form with the exact KinkTube URL, the source URL if known, and a short explanation of the issue.`
}

func defaultContentRemovalPolicy() string {
	return `Last updated: April 26, 2026

This policy explains how to request removal of listings, embeds, thumbnails, titles, tags, or links from KinkTube.

What we can remove

KinkTube does not host video files. We can remove or disable access to KinkTube pages, indexed metadata, embedded players, thumbnails, titles, tags, categories, and outbound links. We cannot remove the original video from Eporner or any other third-party host. If you need source content deleted, contact the original host as well.

Reasons to report content

You may request review if content:

- involves or appears to involve a minor;
- was uploaded, recorded, or distributed without consent;
- depicts coercion, trafficking, exploitation, blackmail, or abuse;
- uses your image, name, likeness, or personal information without authorization;
- infringes copyright or other intellectual property rights;
- contains malware, scams, phishing, or other unsafe behavior;
- violates our Acceptable Content Policy or applicable law.

How to submit a report

Submit the form on this page or use the Contact page and include:

- the exact KinkTube URL;
- the Eporner or third-party source URL, if available;
- the reason for removal;
- whether you are the person depicted, a rights holder, an authorized representative, or another reporter;
- a reliable way for us to contact you if follow-up is needed.

Copyright requests

Copyright complaints should follow our DMCA Notice and Takedown Policy. A copyright notice should identify the copyrighted work, the allegedly infringing KinkTube URL, your contact details, good-faith and accuracy statements, and your signature.

Review process

We review reports in good faith and may remove or disable content while reviewing. We may reject reports that are incomplete, abusive, fraudulent, or unrelated to content on KinkTube. Serious reports involving minors, non-consensual content, trafficking, or credible illegality receive priority.

No source-host control

Removing a listing from KinkTube does not guarantee removal from Eporner, search engines, cached pages, archives, or other websites. You may need to contact those services separately.`
}

func envOrDefault(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}
