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

func TestLoadPrefersOpenAISEOModelWhenOpenAIKeyExists(t *testing.T) {
	t.Setenv("AI_PROVIDER", "")
	t.Setenv("OPENAI_API_KEY", "sk-test")
	t.Setenv("OPENROUTER_API_KEY", "or-test")
	t.Setenv("AI_MODEL", "meta-llama/llama-3.1-8b-instruct:free")
	t.Setenv("OPENAI_SEO_MODEL", "gpt-4o-mini")

	cfg := Load()

	if cfg.OpenAIAPIKey != "sk-test" {
		t.Fatal("expected OpenAI API key to load")
	}
	if cfg.AIModel != "gpt-4o-mini" {
		t.Fatalf("expected OpenAI SEO model, got %q", cfg.AIModel)
	}
}
