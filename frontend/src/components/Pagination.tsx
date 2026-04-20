"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
  hasMore?: boolean;
  totalExact?: boolean;
}

export default function Pagination({
  currentPage,
  totalPages,
  total,
  hasMore = false,
  totalExact = true,
}: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const usesEstimatedTotals = !totalExact;
  const canGoPrevious = currentPage > 1;
  const canGoNext = usesEstimatedTotals ? hasMore : currentPage < totalPages;

  if (!canGoPrevious && !canGoNext) return null;

  const navigateToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    const showPages = 5; // Number of page buttons to show

    if (totalPages <= showPages + 2) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push("ellipsis");
      }

      // Pages around current
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("ellipsis");
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = usesEstimatedTotals ? [] : getPageNumbers();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
      <p className="text-foreground-muted text-sm">
        {usesEstimatedTotals
          ? `Showing page ${currentPage} of live results${hasMore ? " with more available" : ""}`
          : `Showing page ${currentPage} of ${totalPages} (${total.toLocaleString()} videos)`}
      </p>

      <div className="flex items-center gap-2">
        {/* Previous Button */}
        <button
          onClick={() => navigateToPage(currentPage - 1)}
          disabled={!canGoPrevious}
          className="pagination-btn flex items-center gap-1"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        {/* Page Numbers */}
        {!usesEstimatedTotals && (
          <div className="flex items-center gap-1">
            {pageNumbers.map((page, index) =>
              page === "ellipsis" ? (
                <span key={`ellipsis-${index}`} className="px-2 text-foreground-muted">
                  ...
                </span>
              ) : (
                <button
                  key={page}
                  onClick={() => navigateToPage(page)}
                  className={`pagination-btn min-w-[40px] ${currentPage === page ? "active" : ""}`}
                  aria-label={`Page ${page}`}
                  aria-current={currentPage === page ? "page" : undefined}
                >
                  {page}
                </button>
              )
            )}
          </div>
        )}

        {/* Next Button */}
        <button
          onClick={() => navigateToPage(currentPage + 1)}
          disabled={!canGoNext}
          className="pagination-btn flex items-center gap-1"
          aria-label="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
