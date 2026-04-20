package models

import "strings"

var categorySearchQueryOverrides = map[string]string{
	"device-bondage":      "device bondage",
	"extreme-bondage":     "extreme bondage",
	"foot-fetish":         "foot fetish",
	"medical-bondage":     "medical bondage",
	"pet-play":            "pet play",
	"public-humiliation":  "public humiliation",
	"sensory-deprivation": "sensory deprivation",
	"severe-discipline":   "severe discipline",
	"slave":               "slave training",
	"vacbed":              "vacbed",
}

func normalizeImportQuery(query string) string {
	query = strings.ToLower(strings.TrimSpace(query))
	query = strings.ReplaceAll(query, "-", " ")
	return strings.Join(strings.Fields(query), " ")
}

// CategorySearchQuery converts a category slug into the best live-search phrase
// for imports, thumbnails, and any query-driven discovery flows.
func CategorySearchQuery(slug string) string {
	if query, ok := categorySearchQueryOverrides[slug]; ok {
		return query
	}

	return strings.ReplaceAll(slug, "-", " ")
}

// ImportQueries returns the full deduplicated list of upstream search terms the
// importer should cycle through to build a deeper category catalog.
func ImportQueries() []string {
	seen := make(map[string]struct{})
	queries := make([]string, 0, len(SearchKeywords())+len(GetDefaultCategories()))

	addQuery := func(query string) {
		normalized := normalizeImportQuery(query)
		if normalized == "" {
			return
		}
		if _, ok := seen[normalized]; ok {
			return
		}
		seen[normalized] = struct{}{}
		queries = append(queries, query)
	}

	for _, query := range SearchKeywords() {
		addQuery(query)
	}

	for _, category := range GetDefaultCategories() {
		addQuery(CategorySearchQuery(category.Slug))
	}

	return queries
}
