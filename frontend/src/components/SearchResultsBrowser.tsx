"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import Pagination from "@/components/Pagination";
import SearchBar from "@/components/SearchBar";
import { SortSelect } from "@/components/SortSelect";
import { getVideos } from "@/lib/api";
import type { VideoListResponse } from "@/lib/types";
import VideoGrid from "./VideoGrid";

type SearchSortOption = "" | "latest" | "views" | "rating" | "extreme";

interface SearchResultsBrowserProps {
  pageSize: number;
}

const emptyVideoList = (pageSize: number): VideoListResponse => ({
  videos: [],
  total: 0,
  page: 1,
  per_page: pageSize,
  total_pages: 0,
  has_more: false,
  total_exact: true,
});

const popularSearches = [
  "extreme bondage",
  "brutal femdom",
  "predicament",
  "mummification",
  "severe discipline",
  "tight bondage",
  "torture",
];

export default function SearchResultsBrowser({ pageSize }: SearchResultsBrowserProps) {
  const searchParams = useSearchParams();
  const query = (searchParams.get("q") || "").trim();
  const currentPage = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const currentSort = (searchParams.get("sort") as SearchSortOption | null) || "";
  const [videosData, setVideosData] = useState<VideoListResponse>(emptyVideoList(pageSize));
  const [resolvedKey, setResolvedKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentKey = useMemo(
    () =>
      JSON.stringify({
        q: query,
        page: currentPage,
        per_page: pageSize,
        sort: currentSort,
      }),
    [currentPage, currentSort, pageSize, query]
  );

  useEffect(() => {
    if (!query) {
      setVideosData(emptyVideoList(pageSize));
      setResolvedKey(currentKey);
      setError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    getVideos({
      q: query,
      page: currentPage,
      per_page: pageSize,
      ...(currentSort ? { sort: currentSort } : {}),
    })
      .then((data) => {
        if (cancelled) {
          return;
        }
        setVideosData(data);
        setResolvedKey(currentKey);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setError("We couldn't load search results right now. Please try again.");
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentKey, currentPage, currentSort, pageSize, query]);

  const shouldShowLoadingState = !!query && (isLoading || resolvedKey !== currentKey);
  const searchSummary = videosData.total_exact
    ? `Found ${videosData.total.toLocaleString()} video${videosData.total !== 1 ? "s" : ""}`
    : `Showing ${videosData.videos.length.toLocaleString()} result${videosData.videos.length !== 1 ? "s" : ""} on this page. More matches are available.`;

  return (
    <>
      <section className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold mb-4">
          {query ? (
            <>
              Search results for: <span className="text-accent">&quot;{query}&quot;</span>
            </>
          ) : (
            "Search Videos"
          )}
        </h1>

        <div className="md:hidden mb-4">
          <SearchBar placeholder="Search videos..." className="w-full" />
        </div>

        {query && !shouldShowLoadingState && !error && (
          <p className="text-foreground-muted mt-2">{searchSummary}</p>
        )}
      </section>

      {query ? (
        <>
          {!shouldShowLoadingState && !error && videosData.videos.length > 0 && (
            <section className="mb-6 flex items-center justify-end">
              <div className="flex items-center gap-2">
                <span className="text-foreground-muted text-sm">Sort by:</span>
                <SortSelect current={currentSort} showRelevance />
              </div>
            </section>
          )}

          {error ? (
            <div className="rounded-xl border border-border bg-background-secondary p-6 text-center">
              <p className="text-base font-medium text-foreground">Search is temporarily unavailable</p>
              <p className="mt-2 text-sm text-foreground-muted">{error}</p>
            </div>
          ) : (
            <>
              <VideoGrid videos={shouldShowLoadingState ? [] : videosData.videos} loading={shouldShowLoadingState} />

              {!shouldShowLoadingState && (
                <Pagination
                  currentPage={videosData.page}
                  totalPages={videosData.total_pages}
                  total={videosData.total}
                  hasMore={videosData.has_more}
                  totalExact={videosData.total_exact}
                />
              )}
            </>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-foreground-muted text-lg">Enter a search term to find videos</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <p className="text-foreground-muted text-sm w-full mb-2">Popular searches:</p>
            {popularSearches.map((term) => (
              <Link
                key={term}
                href={`/tag/${term.replace(/ /g, '-')}`}
                className="px-4 py-2 bg-background-tertiary text-foreground-muted rounded-full hover:bg-accent hover:text-white transition-colors"
              >
                {term}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
