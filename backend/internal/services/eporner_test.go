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

func TestIsRelevantBDSMVideo_StrongTermAlone(t *testing.T) {
	tests := []struct {
		name  string
		title string
		kw    string
		want  bool
	}{
		{"bondage in title", "Girl in tight bondage scene", "kinky", true},
		{"femdom in keywords", "Domination session", "femdom mistress", true},
		{"shibari in title", "Shibari rope art", "art", true},
		{"slave in keywords", "Training session", "slave training bdsm", true},
		{"dungeon in title", "Dungeon session with leather", "whipping", true},
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

func TestIsRelevantBDSMVideo_WeakTermsRequireTwo(t *testing.T) {
	tests := []struct {
		name  string
		title string
		kw    string
		want  bool
	}{
		{"single weak 'extreme' — reject", "Extreme anal compilation", "anal hardcore", false},
		{"single weak 'brutal' — reject", "Brutal gangbang scene", "gangbang", false},
		{"single weak 'intense' — reject", "Intense threesome action", "threesome", false},
		{"two weak terms — accept", "Extreme rope torture scene", "kinky", true},
		{"weak 'leather' + 'collar' — accept", "Leather collar worn by sub", "fashion fetish", true},
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

func TestIsRelevantBDSMVideo_VanillaBlocklist(t *testing.T) {
	tests := []struct {
		name  string
		title string
		kw    string
		want  bool
	}{
		{"step sister + weak 'extreme' — blocked", "Extreme step sister seduction", "hardcore", false},
		{"massage + weak 'intense' — blocked", "Intense massage leads to more", "oily", false},
		{"casting + weak 'harsh' — blocked", "Harsh casting couch audition", "interview", false},
		{"step mom BUT strong 'bondage' — allowed", "Step mom bondage punishment", "bondage bdsm", true},
		{"fake taxi + no bdsm — blocked", "Fake taxi driver picks up girl", "taxi", false},
		{"yoga + weak 'rope' — blocked", "Yoga girl tied with rope", "flexible", false},
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
