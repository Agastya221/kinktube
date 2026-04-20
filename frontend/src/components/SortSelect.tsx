"use client";

import { startTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface SortSelectProps {
  current?: string;
  showRelevance?: boolean;
}

export function SortSelect({ current, showRelevance = false }: SortSelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <form>
      <select
        name="sort"
        value={current || ""}
        onChange={(e) => {
          const params = new URLSearchParams(searchParams.toString());
          if (e.target.value) {
            params.set("sort", e.target.value);
          } else {
            params.delete("sort");
          }
          params.delete("page");

          const nextUrl = params.size > 0 ? `${pathname}?${params.toString()}` : pathname;
          startTransition(() => {
            router.push(nextUrl);
          });
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
