package config

import "testing"

func TestLoadImportDepthSettings(t *testing.T) {
	t.Setenv("IMPORT_MAX_PAGES", "12")
	t.Setenv("LIGHT_IMPORT_MAX_PAGES", "3")
	t.Setenv("LIGHT_IMPORT_KEYWORDS", "55")

	cfg := Load()

	if cfg.ImportMaxPages != 12 {
		t.Fatalf("expected ImportMaxPages=12, got %d", cfg.ImportMaxPages)
	}
	if cfg.LightImportMaxPages != 3 {
		t.Fatalf("expected LightImportMaxPages=3, got %d", cfg.LightImportMaxPages)
	}
	if cfg.LightImportKeywords != 55 {
		t.Fatalf("expected LightImportKeywords=55, got %d", cfg.LightImportKeywords)
	}
}
