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

func TestIsRelevantBDSMVideo_StrongTermInTitle(t *testing.T) {
	tests := []struct {
		name  string
		title string
		kw    string
		want  bool
	}{
		{"bondage in title", "Girl in tight bondage scene", "kinky", true},
		{"shibari in title", "Shibari rope art", "art", true},
		{"dungeon in title", "Dungeon session with leather", "whipping", true},
		{"hogtied in title", "Hogtied and gagged tight", "bondage", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ev := &EpornerVideo{Title: tt.title, Keywords: tt.kw}
			if got := IsRelevantBDSMVideo(ev); got != tt.want {
				t.Fatalf("IsRelevantBDSMVideo(%q / %q) = %v, want %v", tt.title, tt.kw, got, tt.want)
			}
		})
	}
}

func TestIsRelevantBDSMVideo_TitleMustHaveEvidence(t *testing.T) {
	tests := []struct {
		name  string
		title string
		kw    string
		want  bool
	}{
		// Title has NO BDSM → reject even if keywords have strong terms
		{"vanilla title + bdsm keywords (keyword stuffing)", "Huge Boobed Latina In Tight Yoga Pants Bounces", "bondage, bdsm, slave", false},
		{"generic title + bdsm keywords", "Hot Blonde POV Blowjob", "femdom, bondage", false},
		// Title has 1 weak + keywords have strong → allow (compound evidence)
		{"1 weak title + strong kw", "Extreme session with leather", "femdom mistress", true},
		{"tied in title + bondage in kw", "She gets tied up hard", "bondage, slave", true},
		// Title has 2 weak → allow
		{"2 weak in title", "Extreme rope torture scene", "kinky", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ev := &EpornerVideo{Title: tt.title, Keywords: tt.kw}
			if got := IsRelevantBDSMVideo(ev); got != tt.want {
				t.Fatalf("IsRelevantBDSMVideo(%q / %q) = %v, want %v", tt.title, tt.kw, got, tt.want)
			}
		})
	}
}

func TestIsRelevantBDSMVideo_HardVanillaBlock(t *testing.T) {
	tests := []struct {
		name  string
		title string
		kw    string
		want  bool
	}{
		// Family roleplay — ALWAYS blocked, even with BDSM terms
		{"step sister + bondage in title", "Step sister bondage punishment", "bondage bdsm", false},
		{"stepmom + slave in title", "Stepmom slave training dungeon", "femdom bdsm", false},
		{"stepbrothers plural", "Stepbrothers little adventure", "bondage", false},
		{"brazzers studio", "Brazzers bondage scene", "bondage bdsm", false},
		{"fake taxi", "Fake taxi driver picks up bondage girl", "bdsm", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ev := &EpornerVideo{Title: tt.title, Keywords: tt.kw}
			if got := IsRelevantBDSMVideo(ev); got != tt.want {
				t.Fatalf("IsRelevantBDSMVideo(%q / %q) = %v, want %v", tt.title, tt.kw, got, tt.want)
			}
		})
	}
}

func TestIsRelevantBDSMVideo_SoftVanillaBlock(t *testing.T) {
	tests := []struct {
		name  string
		title string
		kw    string
		want  bool
	}{
		// Soft vanilla — blocked unless title has strong BDSM
		{"yoga + weak rope in title", "Yoga girl tied with rope", "flexible", false},
		{"massage + weak intense", "Intense massage leads to more", "oily", false},
		// Soft vanilla + strong BDSM in title → allowed
		{"yoga + bondage in title", "Yoga bondage suspension scene", "flexible bdsm", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ev := &EpornerVideo{Title: tt.title, Keywords: tt.kw}
			if got := IsRelevantBDSMVideo(ev); got != tt.want {
				t.Fatalf("IsRelevantBDSMVideo(%q / %q) = %v, want %v", tt.title, tt.kw, got, tt.want)
			}
		})
	}
}

func TestIsRelevantBDSMVideo_BodyIndicators(t *testing.T) {
	tests := []struct {
		name  string
		title string
		kw    string
		want  bool
	}{
		{"bounces + oiled = 2 body indicators, no strong title", "Oiled up latina bounces on cock", "bondage extreme", false},
		{"body indicators + strong title = ok", "Slave bounces while oiled in bondage", "bdsm", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ev := &EpornerVideo{Title: tt.title, Keywords: tt.kw}
			if got := IsRelevantBDSMVideo(ev); got != tt.want {
				t.Fatalf("IsRelevantBDSMVideo(%q / %q) = %v, want %v", tt.title, tt.kw, got, tt.want)
			}
		})
	}
}
