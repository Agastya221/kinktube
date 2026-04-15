package models

import "testing"

func TestIsLikelyEnglishText(t *testing.T) {
	t.Run("accepts english fetish metadata", func(t *testing.T) {
		if !IsLikelyEnglishText("Latex rubber catsuit bondage", "latex bdsm catsuit") {
			t.Fatal("expected english metadata to pass")
		}
	})

	t.Run("accepts emoji and punctuation around english text", func(t *testing.T) {
		if !IsLikelyEnglishText("Latex bondage - 4K", "bdsm, catsuit, rubber") {
			t.Fatal("expected english metadata with punctuation to pass")
		}
	})

	t.Run("rejects cyrillic metadata", func(t *testing.T) {
		if IsLikelyEnglishText("Русское БДСМ связывание", "фетиш, рабыня") {
			t.Fatal("expected cyrillic metadata to be rejected")
		}
	})

	t.Run("rejects japanese metadata", func(t *testing.T) {
		if IsLikelyEnglishText("緊縛 監禁", "縄, 拘束") {
			t.Fatal("expected japanese metadata to be rejected")
		}
	})

	t.Run("rejects mixed metadata dominated by non latin text", func(t *testing.T) {
		if IsLikelyEnglishText("Latex 緊縛 監禁", "拘束, ラバー") {
			t.Fatal("expected mixed metadata with dominant non-latin text to be rejected")
		}
	})
}
