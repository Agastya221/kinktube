package services

import "testing"

func TestEnhanceQueryForBDSM(t *testing.T) {
	tests := map[string]string{
		"latex":           "latex rubber catsuit bdsm",
		"medical bondage": "medical bondage bdsm",
		"bondage":         "bondage",
	}

	for query, want := range tests {
		if got := EnhanceQueryForBDSM(query); got != want {
			t.Fatalf("EnhanceQueryForBDSM(%q) = %q, want %q", query, got, want)
		}
	}
}

func TestMatchesQueryIntentForLatex(t *testing.T) {
	t.Run("accepts latex-specific content", func(t *testing.T) {
		video := &EpornerVideo{
			Title:    "Latex rubber catsuit bondage",
			Keywords: "latex rubber bdsm catsuit",
		}

		if !MatchesQueryIntent(video, "latex") {
			t.Fatal("expected latex video to match latex intent")
		}
	})

	t.Run("rejects generic content", func(t *testing.T) {
		video := &EpornerVideo{
			Title:    "Bedroom hardcore scene",
			Keywords: "hardcore sex",
		}

		if MatchesQueryIntent(video, "latex") {
			t.Fatal("expected generic video not to match latex intent")
		}
	})
}

func TestMatchesTopicAndBDSMRejectsNonEnglishMetadata(t *testing.T) {
	video := &EpornerVideo{
		Title:    "Латекс БДСМ связывание",
		Keywords: "латекс, bdsm, рабыня",
	}

	if MatchesTopicAndBDSM(video, "latex") {
		t.Fatal("expected non-english metadata to be rejected")
	}
}
