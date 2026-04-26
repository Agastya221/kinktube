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

// nonEnglishLatinWords are common words from non-English languages that use the Latin script.
// These indicate Indonesian, Malay, Tagalog, or other non-English content.
var nonEnglishLatinWords = []string{
	// Indonesian/Malay
	"cantik", "rela", "entot", "ngentot", "memek", "kontol", "jilbab", "hijab",
	"guru", "siswa", "sma", "smk", "abg", "bokep", "tante", "pembantu",
	"budak", "melayu", "cewek", "cowok", "bugil", "telanjang", "sekolah",
	"ngintip", "pelajar", "mahasiswi", "janda", "binal", "semok", "toket",
	"dientot", "diperkosa", "colmek", "sange", "hamil", "ibu", "anak",
	// Tagalog
	"pinay", "pilipina", "kantot", "kinantot", "tite", "puki", "pepe",
	// Common link spam patterns
	"linktr", "bit.ly", "rebrand.ly", "tinyurl",
}

// IsLikelyEnglishText rejects titles/keywords that are dominated by non-Latin scripts
// or contain known non-English Latin-script words (Indonesian, Tagalog, etc).
func IsLikelyEnglishText(values ...string) bool {
	text := strings.TrimSpace(strings.Join(values, " "))
	if text == "" {
		return true
	}

	// Fast-path: reject known non-English Latin words
	textLower := strings.ToLower(text)
	for _, word := range nonEnglishLatinWords {
		if strings.Contains(textLower, word) {
			return false
		}
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
