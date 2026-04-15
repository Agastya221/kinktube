package database

import "testing"

func TestRelatedVideosCacheKeyIncludesLimit(t *testing.T) {
	first := RelatedVideosCacheKey(42, 12)
	second := RelatedVideosCacheKey(42, 24)

	if first == second {
		t.Fatalf("expected related video cache keys to differ by limit, got %q", first)
	}
}
