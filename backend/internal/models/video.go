package models

import (
	"time"
)

// Video represents a video entry in our database
type Video struct {
	ID            int64     `json:"id"`
	ExternalID    string    `json:"external_id"`    // Eporner video ID
	Title         string    `json:"title"`
	Description   string    `json:"description,omitempty"`
	Duration      int       `json:"duration"`       // Duration in seconds
	DurationStr   string    `json:"duration_str"`   // Human readable duration
	Views         int64     `json:"views"`
	Rating        float64   `json:"rating"`
	Thumbnail     string    `json:"thumbnail"`
	ThumbnailLg   string    `json:"thumbnail_lg"`   // Large thumbnail
	EmbedURL      string    `json:"embed_url"`
	SourceURL     string    `json:"source_url"`     // Original video page URL
	Tags          []string  `json:"tags"`
	Categories    []string  `json:"categories"`
	Keywords      string    `json:"keywords"`       // Search keywords that found this video
	AddedAt       time.Time `json:"added_at"`       // When added to our DB
	PublishedAt   time.Time `json:"published_at"`   // Original publish date
	LastUpdatedAt time.Time `json:"last_updated_at"`
}

// VideoListResponse is the API response for video listings
type VideoListResponse struct {
	Videos     []Video `json:"videos"`
	Total      int64   `json:"total"`
	Page       int     `json:"page"`
	PerPage    int     `json:"per_page"`
	TotalPages int     `json:"total_pages"`
}

// Category represents a BDSM category for navigation
type Category struct {
	Slug        string `json:"slug"`
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	VideoCount  int64  `json:"video_count"`
}

// GetDefaultCategories returns our curated BDSM categories
func GetDefaultCategories() []Category {
	return []Category{
		{Slug: "femdom", Name: "Femdom", Description: "Female domination videos"},
		{Slug: "bondage", Name: "Bondage", Description: "Rope bondage and restraints"},
		{Slug: "bdsm", Name: "BDSM", Description: "General BDSM content"},
		{Slug: "slave", Name: "Slave", Description: "Master/slave dynamics"},
		{Slug: "submission", Name: "Submission", Description: "Submissive training and play"},
		{Slug: "device-bondage", Name: "Device Bondage", Description: "Mechanical restraints and devices"},
		{Slug: "spanking", Name: "Spanking", Description: "Spanking and impact play"},
		{Slug: "latex", Name: "Latex", Description: "Latex and rubber fetish"},
		{Slug: "leather", Name: "Leather", Description: "Leather fetish content"},
		{Slug: "dominatrix", Name: "Dominatrix", Description: "Professional dominatrix videos"},
		{Slug: "whipping", Name: "Whipping", Description: "Whips and flagellation"},
		{Slug: "cbt", Name: "CBT", Description: "Cock and ball torture"},
		{Slug: "foot-fetish", Name: "Foot Fetish", Description: "Foot worship and fetish"},
		{Slug: "facesitting", Name: "Facesitting", Description: "Facesitting and smothering"},
		{Slug: "strapon", Name: "Strapon", Description: "Pegging and strapon play"},
	}
}

// SearchKeywords returns the search terms we use to import BDSM content
func SearchKeywords() []string {
	return []string{
		"bdsm",
		"femdom",
		"female domination",
		"bondage",
		"slave",
		"submission",
		"device bondage",
		"spanking",
		"latex fetish",
		"leather fetish",
		"dominatrix",
		"whipping",
		"mistress",
		"domme",
		"goddess worship",
		"dungeon",
		"tied up",
		"rope bondage",
		"shibari",
		"suspension bondage",
		"hogtie",
		"hogtied",
		"predicament bondage",
		"handcuffs",
		"blindfold bondage",
		"mouth gag",
		"ball gag",
		"collar slave",
		"slave training",
		"foot worship",
		"facesitting",
		"smothering",
		"strapon femdom",
		"cbt",
		"ball busting",
		"orgasm control",
		"chastity",
		"nipple torture",
		"wax play",
		"electro play",
		"caning",
		"paddling",
		"crop",
		"rubber fetish",
		"catsuit",
		"medical bondage",
		"vacbed",
		"spreader bar",
	}
}
