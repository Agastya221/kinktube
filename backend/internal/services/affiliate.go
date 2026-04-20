package services

import (
	"os"
	"strings"

	"kinktube/internal/models"
)

// AffiliateProgram represents an affiliate program configuration
type AffiliateProgram struct {
	Name        string `json:"name"`
	DisplayName string `json:"display_name"`
	BaseURL     string `json:"base_url"`
	TrackingID  string `json:"tracking_id"`
	Description string `json:"description"`
	LogoURL     string `json:"logo_url,omitempty"`
	Priority    int    `json:"priority"` // Higher = more preferred
}

// AffiliateLink represents a matched affiliate link
type AffiliateLink struct {
	Program     string `json:"program"`
	DisplayName string `json:"display_name"`
	URL         string `json:"url"`
	Description string `json:"description"`
	CTA         string `json:"cta"` // Call to action text
	LogoURL     string `json:"logo_url,omitempty"`
	IsPrimary   bool   `json:"is_primary"`
}

// AffiliateService handles affiliate link matching and generation
type AffiliateService struct {
	programs map[string]*AffiliateProgram
	rules    []affiliateRule
}

// affiliateRule defines matching rules for affiliate programs
type affiliateRule struct {
	keywords []string
	program  string
	subPath  string // Specific landing page path
	cta      string
}

// NewAffiliateService creates a new affiliate service with configured programs
func NewAffiliateService() *AffiliateService {
	s := &AffiliateService{
		programs: make(map[string]*AffiliateProgram),
	}

	// Load affiliate programs from environment
	s.loadPrograms()
	s.setupRules()

	return s
}

// ApplySettings replaces the program tracking IDs at runtime from admin-managed settings.
func (s *AffiliateService) ApplySettings(settings models.AffiliateSettings) {
	s.programs = make(map[string]*AffiliateProgram)

	addProgram := func(key, displayName, baseURL, trackingID, description string, priority int) {
		trackingID = strings.TrimSpace(trackingID)
		if trackingID == "" {
			return
		}

		s.programs[key] = &AffiliateProgram{
			Name:        key,
			DisplayName: displayName,
			BaseURL:     baseURL,
			TrackingID:  trackingID,
			Description: description,
			Priority:    priority,
		}
	}

	addProgram("kinkydollars", "Kink.com", "https://www.kink.com", settings.KinkyDollarsID, "Premium BDSM & Fetish Videos", 100)
	addProgram("clubdomcash", "ClubDom", "https://www.clubdom.com", settings.ClubDomCashID, "Elite Femdom & Female Domination", 90)
	addProgram("devicebondage", "Device Bondage", "https://www.devicebondage.com", settings.DeviceBondageID, "Extreme Device Bondage & Restraints", 85)
	addProgram("hogtied", "Hogtied", "https://www.hogtied.com", settings.HogtiedID, "Rope Bondage & Suspension", 80)
	addProgram("whippedass", "Whipped Ass", "https://www.whippedass.com", settings.WhippedAssID, "Lesbian BDSM & Domination", 75)
	addProgram("sadisticrope", "Sadistic Rope", "https://www.sadisticrope.com", settings.SadisticRopeID, "Extreme Rope Bondage", 70)
	addProgram("femdomempire", "FemDom Empire", "https://www.femdomempire.com", settings.FemdomEmpireID, "Premium Femdom Content", 85)

	defaultID := strings.TrimSpace(settings.DefaultID)
	if _, exists := s.programs["kinkydollars"]; !exists {
		if defaultID == "" {
			defaultID = "default"
		}
		s.programs["kinkydollars"] = &AffiliateProgram{
			Name:        "kinkydollars",
			DisplayName: "Kink.com",
			BaseURL:     "https://www.kink.com",
			TrackingID:  defaultID,
			Description: "Premium BDSM & Fetish Videos",
			Priority:    100,
		}
	}
}

func (s *AffiliateService) loadPrograms() {
	// KinkyDollars (Kink.com network) - Primary program
	if trackingID := os.Getenv("AFFILIATE_KINKYDOLLARS_ID"); trackingID != "" {
		s.programs["kinkydollars"] = &AffiliateProgram{
			Name:        "kinkydollars",
			DisplayName: "Kink.com",
			BaseURL:     "https://www.kink.com",
			TrackingID:  trackingID,
			Description: "Premium BDSM & Fetish Videos",
			Priority:    100,
		}
	}

	// ClubDomCash (Femdom focused)
	if trackingID := os.Getenv("AFFILIATE_CLUBDOMCASH_ID"); trackingID != "" {
		s.programs["clubdomcash"] = &AffiliateProgram{
			Name:        "clubdomcash",
			DisplayName: "ClubDom",
			BaseURL:     "https://www.clubdom.com",
			TrackingID:  trackingID,
			Description: "Elite Femdom & Female Domination",
			Priority:    90,
		}
	}

	// Device Bondage specific
	if trackingID := os.Getenv("AFFILIATE_DEVICEBONDAGE_ID"); trackingID != "" {
		s.programs["devicebondage"] = &AffiliateProgram{
			Name:        "devicebondage",
			DisplayName: "Device Bondage",
			BaseURL:     "https://www.devicebondage.com",
			TrackingID:  trackingID,
			Description: "Extreme Device Bondage & Restraints",
			Priority:    85,
		}
	}

	// Hogtied
	if trackingID := os.Getenv("AFFILIATE_HOGTIED_ID"); trackingID != "" {
		s.programs["hogtied"] = &AffiliateProgram{
			Name:        "hogtied",
			DisplayName: "Hogtied",
			BaseURL:     "https://www.hogtied.com",
			TrackingID:  trackingID,
			Description: "Rope Bondage & Suspension",
			Priority:    80,
		}
	}

	// Whipped Ass
	if trackingID := os.Getenv("AFFILIATE_WHIPPEDASS_ID"); trackingID != "" {
		s.programs["whippedass"] = &AffiliateProgram{
			Name:        "whippedass",
			DisplayName: "Whipped Ass",
			BaseURL:     "https://www.whippedass.com",
			TrackingID:  trackingID,
			Description: "Lesbian BDSM & Domination",
			Priority:    75,
		}
	}

	// Sadistic Rope
	if trackingID := os.Getenv("AFFILIATE_SADISTICROPE_ID"); trackingID != "" {
		s.programs["sadisticrope"] = &AffiliateProgram{
			Name:        "sadisticrope",
			DisplayName: "Sadistic Rope",
			BaseURL:     "https://www.sadisticrope.com",
			TrackingID:  trackingID,
			Description: "Extreme Rope Bondage",
			Priority:    70,
		}
	}

	// FemDomEmpire
	if trackingID := os.Getenv("AFFILIATE_FEMDOMEMPIRE_ID"); trackingID != "" {
		s.programs["femdomempire"] = &AffiliateProgram{
			Name:        "femdomempire",
			DisplayName: "FemDom Empire",
			BaseURL:     "https://www.femdomempire.com",
			TrackingID:  trackingID,
			Description: "Premium Femdom Content",
			Priority:    85,
		}
	}

	// Default fallback - ensure KinkyDollars is always available
	if _, exists := s.programs["kinkydollars"]; !exists {
		defaultID := os.Getenv("AFFILIATE_DEFAULT_ID")
		if defaultID == "" {
			defaultID = "default"
		}
		s.programs["kinkydollars"] = &AffiliateProgram{
			Name:        "kinkydollars",
			DisplayName: "Kink.com",
			BaseURL:     "https://www.kink.com",
			TrackingID:  defaultID,
			Description: "Premium BDSM & Fetish Videos",
			Priority:    100,
		}
	}
}

func (s *AffiliateService) setupRules() {
	// Define matching rules - order matters (first match wins for primary)
	s.rules = []affiliateRule{
		// Femdom specific
		{
			keywords: []string{"femdom", "mistress", "dominatrix", "female domination", "goddess", "domme"},
			program:  "clubdomcash",
			cta:      "Watch Full Femdom Scene",
		},
		{
			keywords: []string{"femdom", "mistress", "dominatrix"},
			program:  "femdomempire",
			cta:      "Join FemDom Empire",
		},

		// Device bondage specific
		{
			keywords: []string{"device bondage", "device", "machine", "mechanical", "sybian", "fucking machine"},
			program:  "devicebondage",
			cta:      "See Full Device Bondage",
		},

		// Rope bondage specific
		{
			keywords: []string{"rope", "shibari", "suspension", "hogtie", "hogtied", "tied up"},
			program:  "hogtied",
			cta:      "Watch Full Rope Bondage",
		},
		{
			keywords: []string{"rope bondage", "extreme rope", "predicament"},
			program:  "sadisticrope",
			cta:      "Extreme Rope Scenes",
		},

		// Lesbian BDSM
		{
			keywords: []string{"lesbian bdsm", "lesbian domination", "girl on girl", "whipped"},
			program:  "whippedass",
			cta:      "Lesbian BDSM Videos",
		},

		// General BDSM - fallback to Kink.com
		{
			keywords: []string{"bdsm", "bondage", "slave", "submission", "punishment", "torture", "dungeon"},
			program:  "kinkydollars",
			cta:      "Watch Premium BDSM",
		},

		// Specific kinks
		{
			keywords: []string{"spanking", "whipping", "caning", "paddle", "crop"},
			program:  "kinkydollars",
			subPath:  "/channel/theupperfloor",
			cta:      "Premium Spanking Videos",
		},
		{
			keywords: []string{"latex", "rubber", "catsuit", "shiny"},
			program:  "kinkydollars",
			cta:      "Latex Fetish Videos",
		},
		{
			keywords: []string{"foot", "feet", "foot worship", "footjob"},
			program:  "kinkydollars",
			cta:      "Foot Fetish Premium",
		},
		{
			keywords: []string{"strapon", "pegging", "strap-on"},
			program:  "clubdomcash",
			cta:      "Strapon Domination",
		},
		{
			keywords: []string{"cbt", "cock torture", "ball torture", "ball busting"},
			program:  "clubdomcash",
			cta:      "CBT Premium Videos",
		},
		{
			keywords: []string{"facesitting", "smothering", "face sitting"},
			program:  "clubdomcash",
			cta:      "Facesitting Videos",
		},
	}
}

// GetAffiliateLinks returns matched affiliate links based on video tags and keywords
func (s *AffiliateService) GetAffiliateLinks(tags []string, queryUsed string, maxLinks int) []AffiliateLink {
	if maxLinks <= 0 {
		maxLinks = 2
	}

	// Combine tags and query for matching
	searchText := strings.ToLower(queryUsed + " " + strings.Join(tags, " "))

	var links []AffiliateLink
	usedPrograms := make(map[string]bool)

	// Match against rules
	for _, rule := range s.rules {
		if len(links) >= maxLinks {
			break
		}

		// Check if any keyword matches
		matched := false
		for _, keyword := range rule.keywords {
			if strings.Contains(searchText, keyword) {
				matched = true
				break
			}
		}

		if !matched {
			continue
		}

		// Get the program
		program, exists := s.programs[rule.program]
		if !exists || usedPrograms[rule.program] {
			continue
		}

		usedPrograms[rule.program] = true

		// Build the affiliate URL
		url := s.buildAffiliateURL(program, rule.subPath)

		links = append(links, AffiliateLink{
			Program:     program.Name,
			DisplayName: program.DisplayName,
			URL:         url,
			Description: program.Description,
			CTA:         rule.cta,
			LogoURL:     program.LogoURL,
			IsPrimary:   len(links) == 0, // First link is primary
		})
	}

	// If no matches, add default Kink.com link
	if len(links) == 0 {
		if program, exists := s.programs["kinkydollars"]; exists {
			links = append(links, AffiliateLink{
				Program:     program.Name,
				DisplayName: program.DisplayName,
				URL:         s.buildAffiliateURL(program, ""),
				Description: program.Description,
				CTA:         "Watch Full Premium Scene",
				LogoURL:     program.LogoURL,
				IsPrimary:   true,
			})
		}
	}

	return links
}

// buildAffiliateURL constructs the full affiliate URL with tracking
func (s *AffiliateService) buildAffiliateURL(program *AffiliateProgram, subPath string) string {
	baseURL := program.BaseURL

	// Add subpath if specified
	if subPath != "" {
		baseURL = baseURL + subPath
	}

	// Add tracking parameter based on program
	switch program.Name {
	case "kinkydollars":
		return baseURL + "?c=" + program.TrackingID
	case "clubdomcash":
		return baseURL + "?nats=" + program.TrackingID
	case "femdomempire":
		return baseURL + "?nats=" + program.TrackingID
	default:
		// Generic tracking parameter
		return baseURL + "?ref=" + program.TrackingID
	}
}

// GetAllPrograms returns all configured affiliate programs
func (s *AffiliateService) GetAllPrograms() []*AffiliateProgram {
	programs := make([]*AffiliateProgram, 0, len(s.programs))
	for _, p := range s.programs {
		programs = append(programs, p)
	}
	return programs
}
