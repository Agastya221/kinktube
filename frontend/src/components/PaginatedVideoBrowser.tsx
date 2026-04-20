"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import Pagination from "@/components/Pagination";
import { NativeAd } from "@/components/ads";
import { SortSelect } from "@/components/SortSelect";
import { getVideos } from "@/lib/api";
import type { VideoListResponse, VideoQueryParams } from "@/lib/types";
import VideoGrid from "./VideoGrid";

type SortOption = "latest" | "views" | "rating" | "extreme";

interface PaginatedVideoBrowserProps {
  initialData: VideoListResponse;
  pageSize: number;
  defaultSort?: SortOption;
  headingVariant?: "home" | "category";
  queryParams?: Pick<VideoQueryParams, "category" | "q">;
  showNativeAd?: boolean;
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

export default function PaginatedVideoBrowser({
  initialData,
  pageSize,
  defaultSort = "latest",
  headingVariant = "home",
  queryParams = {},
  showNativeAd = false,
}: PaginatedVideoBrowserProps) {
  const searchParams = useSearchParams();
  const currentPage = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const currentSort = (searchParams.get("sort") as SortOption | null) || defaultSort;
  const [videosData, setVideosData] = useState<VideoListResponse>(initialData);
  const [resolvedKey, setResolvedKey] = useState(() =>
    JSON.stringify({
      page: initialData.page,
      per_page: pageSize,
      sort: defaultSort,
      ...queryParams,
    })
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentKey = useMemo(
    () =>
      JSON.stringify({
        page: currentPage,
        per_page: pageSize,
        sort: currentSort,
        ...queryParams,
      }),
    [currentPage, currentSort, pageSize, queryParams]
  );

  useEffect(() => {
    const initialKey = JSON.stringify({
      page: initialData.page,
      per_page: pageSize,
      sort: defaultSort,
      ...queryParams,
    });

    if (currentKey === initialKey) {
      setVideosData(initialData);
      setResolvedKey(initialKey);
      setError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    getVideos({
      page: currentPage,
      per_page: pageSize,
      sort: currentSort,
      ...queryParams,
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
        setError("We couldn't load this page right now. Please try again.");
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentKey, currentPage, currentSort, defaultSort, initialData, pageSize, queryParams]);

  const shouldShowLoadingState = isLoading || resolvedKey !== currentKey;
  const activeData = shouldShowLoadingState ? emptyVideoList(pageSize) : videosData;

  const heading =
    headingVariant === "category"
      ? currentSort === "latest"
        ? "Latest"
        : currentSort === "views"
          ? "Most Viewed"
          : currentSort === "extreme"
            ? "Most Extreme"
            : "Top Rated"
      : currentSort === "latest"
        ? "Latest Videos"
        : currentSort === "views"
          ? "Most Viewed"
          : currentSort === "extreme"
            ? "Most Extreme"
            : "Top Rated";

  return (
    <>
      <section className="mb-4 md:mb-6 flex items-center justify-between gap-2">
        <h2 className="text-base sm:text-xl md:text-2xl font-semibold truncate">{heading}</h2>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-foreground-muted text-xs sm:text-sm hidden sm:inline">Sort:</span>
          <SortSelect current={currentSort} />
        </div>
      </section>

      {error ? (
        <div className="rounded-xl border border-border bg-background-secondary p-6 text-center">
          <p className="text-base font-medium text-foreground">Results are temporarily unavailable</p>
          <p className="mt-2 text-sm text-foreground-muted">{error}</p>
        </div>
      ) : (
        <>
          <VideoGrid videos={activeData.videos} loading={shouldShowLoadingState} />

          {!shouldShowLoadingState && showNativeAd && activeData.videos.length > 12 && (
            <div className="my-8 flex justify-center">
              <NativeAd className="max-w-sm" />
            </div>
          )}

          {!shouldShowLoadingState && (
            <Pagination
              currentPage={activeData.page}
              totalPages={activeData.total_pages}
              total={activeData.total}
              hasMore={activeData.has_more}
              totalExact={activeData.total_exact}
            />
          )}
        </>
      )}
    </>
  );
}
