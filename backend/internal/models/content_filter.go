package models

import (
	"strings"
	"unicode"
)

var disallowedLanguageScripts = []*unicode.RangeTable{
	unicode.Cyrillic,
	unicode.Han,
	unicode.Hiragana,
	unicode.Katakana,
	unicode.Hangul,
	unicode.Arabic,
	unicode.Hebrew,
	unicode.Thai,
	unicode.Devanagari,
}

// IsLikelyEnglishText rejects titles/keywords that are dominated by non-Latin scripts.
// We keep accented Latin characters valid so normal English/European metadata still passes.
func IsLikelyEnglishText(values ...string) bool {
	text := strings.TrimSpace(strings.Join(values, " "))
	if text == "" {
		return true
	}

	var totalLetters int
	var latinLetters int
	var disallowedLetters int

	for _, r := range text {
		if !unicode.IsLetter(r) {
			continue
		}

		totalLetters++
		if unicode.In(r, unicode.Latin) {
			latinLetters++
			continue
		}

		for _, script := range disallowedLanguageScripts {
			if unicode.In(r, script) {
				disallowedLetters++
				break
			}
		}
	}

	if totalLetters == 0 {
		return true
	}

	latinRatio := latinLetters * 100 / totalLetters

	if disallowedLetters >= 3 {
		return false
	}

	if disallowedLetters > 0 && latinRatio < 80 {
		return false
	}

	if totalLetters >= 6 && latinRatio < 60 {
		return false
	}

	return true
}

// IsLikelyEnglishVideo applies the metadata heuristic to stored videos.
func IsLikelyEnglishVideo(video *Video) bool {
	if video == nil {
		return false
	}

	return IsLikelyEnglishText(video.Title, strings.Join(video.Tags, " "), video.Keywords)
}
