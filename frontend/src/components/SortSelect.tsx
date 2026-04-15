"use client";

interface SortSelectProps {
  current?: string;
  showRelevance?: boolean;
}

export function SortSelect({ current, showRelevance = false }: SortSelectProps) {
  return (
    <form>
      <select
        name="sort"
        defaultValue={current || ""}
        onChange={(e) => {
          const url = new URL(window.location.href);
          if (e.target.value) {
            url.searchParams.set("sort", e.target.value);
          } else {
            url.searchParams.delete("sort");
          }
          url.searchParams.delete("page");
          window.location.href = url.toString();
        }}
        className="bg-background-tertiary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
      >
        {showRelevance && <option value="">Most Relevant</option>}
        <option value="views">Most Viewed</option>
        <option value="rating">Top Rated</option>
        <option value="latest">Latest</option>
        <option value="extreme">Most Extreme</option>
      </select>
    </form>
  );
}
