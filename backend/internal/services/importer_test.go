package services

import "testing"

func TestMaxImportPagesFromResponse(t *testing.T) {
	response := &EpornerResponse{
		Count:   950,
		PerPage: 100,
		Page:    1,
	}

	if got := maxImportPagesFromResponse(response, 8); got != 8 {
		t.Fatalf("expected configured cap of 8 pages, got %d", got)
	}

	if got := maxImportPagesFromResponse(response, 20); got != 10 {
		t.Fatalf("expected available page count of 10, got %d", got)
	}
}
