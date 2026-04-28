package services

import "testing"

func TestParseSEOMetadataStripsJSONFence(t *testing.T) {
	raw := "```json\n{\"title\":\"Test\",\"meta_description\":\"Neutral adult catalog description.\",\"description\":\"This neutral adult BDSM catalog description has enough length to pass validation without being explicit.\",\"slug\":\"test\",\"tags\":[\"bdsm\",\"bondage\"],\"category\":\"bdsm\",\"safety_notes\":\"\",\"rejected\":false}\n```"

	metadata, err := parseSEOMetadata(raw)
	if err != nil {
		t.Fatalf("parseSEOMetadata returned error: %v", err)
	}

	metadata.normalize("Fallback", []string{"bdsm"}, []string{"bondage"})

	if metadata.Title != "Test" {
		t.Fatalf("expected title to parse, got %q", metadata.Title)
	}
	if metadata.Rejected {
		t.Fatal("expected usable metadata")
	}
}

func TestUnsafeSEOInputRejectsMinorAndNonConsentSignals(t *testing.T) {
	tests := []struct {
		name  string
		title string
		tags  []string
	}{
		{name: "minor signal", title: "Underage bondage scene"},
		{name: "non consent signal", title: "BDSM scene", tags: []string{"non consensual"}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if _, ok := unsafeSEOInput(tt.title, []string{"bdsm"}, tt.tags); !ok {
				t.Fatal("expected unsafe input to be rejected")
			}
		})
	}
}

func TestUnsafeSEOInputAllowsConsensualBDSMTerms(t *testing.T) {
	_, rejected := unsafeSEOInput(
		"Strict mistress bondage training",
		[]string{"femdom", "bondage", "teen"},
		[]string{"slave roleplay", "orgasm control", "spanking"},
	)
	if rejected {
		t.Fatal("expected consensual BDSM catalog terms to pass local filter")
	}
}
