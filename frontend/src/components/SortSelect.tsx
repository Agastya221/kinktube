"use client";

export function SortSelect({ current }: { current: string }) {
  return (
    <form>
      <select
        name="sort"
        defaultValue={current}
        onChange={(e) => {
          const url = new URL(window.location.href);
          url.searchParams.set("sort", e.target.value);
          url.searchParams.delete("page");
          window.location.href = url.toString();
        }}
        className="bg-background-tertiary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
      >
        <option value="latest">Latest</option>
        <option value="extreme">Most Extreme</option>
        <option value="views">Most Viewed</option>
        <option value="rating">Top Rated</option>
      </select>
    </form>
  );
}
