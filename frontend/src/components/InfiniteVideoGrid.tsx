"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import VideoCard, { VideoCardSkeleton } from "./VideoCard";
import { getVideoIdentifier, type Video, type VideoQueryParams } from "@/lib/types";
import { getVideos } from "@/lib/api";
import { Loader2 } from "lucide-react";

interface InfiniteVideoGridProps {
  initialVideos: Video[];
  initialPage: number;
  totalPages: number;
  queryParams: VideoQueryParams;
}

function normalizeVideoDedupText(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

function getVideoDedupKeys(video: Video): string[] {
  const keys: string[] = [];

  if (video.external_id) {
    keys.push(`external:${video.external_id}`);
  }

  if (video.source_url) {
    keys.push(`source:${video.source_url.toLowerCase()}`);
  }

  if (video.embed_url) {
    keys.push(`embed:${video.embed_url.toLowerCase()}`);
  }

  const titleKey = normalizeVideoDedupText(video.title);
  if (titleKey) {
    keys.push(`title-duration:${titleKey}|${video.duration}`);
    const thumbKey = (video.thumbnail_lg || video.thumbnail || "").toLowerCase();
    if (thumbKey) {
      keys.push(`title-thumb:${titleKey}|${thumbKey}`);
    }
  }

  return keys;
}

function mergeUniqueVideos(existing: Video[], incoming: Video[]): Video[] {
  const seen = new Set<string>();
  const merged: Video[] = [];

  for (const video of [...existing, ...incoming]) {
    const keys = getVideoDedupKeys(video);
    if (keys.some((key) => seen.has(key))) {
      continue;
    }

    keys.forEach((key) => seen.add(key));
    merged.push(video);
  }

  return merged;
}

export default function InfiniteVideoGrid({
  initialVideos,
  initialPage,
  totalPages,
  queryParams,
}: InfiniteVideoGridProps) {
  const [videos, setVideos] = useState<Video[]>(() => mergeUniqueVideos([], initialVideos));
  const [page, setPage] = useState(initialPage);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialPage < totalPages);
  const [error, setError] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Load more videos
  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    setError(null);

    try {
      const nextPage = page + 1;
      const response = await getVideos({
        ...queryParams,
        page: nextPage,
      });

      setVideos((prev) => mergeUniqueVideos(prev, response.videos));
      setPage(nextPage);
      setHasMore(nextPage < response.total_pages);
    } catch {
      setError("Failed to load more videos");
    } finally {
      setIsLoading(false);
    }
  }, [page, hasMore, isLoading, queryParams]);

  // Setup intersection observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMore();
        }
      },
      {
        rootMargin: "200px",
        threshold: 0,
      }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, isLoading, loadMore]);

  // Reset when query params change
  useEffect(() => {
    setVideos(mergeUniqueVideos([], initialVideos));
    setPage(initialPage);
    setHasMore(initialPage < totalPages);
  }, [initialVideos, initialPage, totalPages]);

  if (videos.length === 0 && !isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-foreground-muted text-lg">No videos found</p>
        <p className="text-foreground-muted text-sm mt-2">
          Try a different search or browse our categories
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Video Grid */}
      <div className="video-grid">
        {videos.map((video) => (
          <VideoCard key={getVideoIdentifier(video)} video={video} />
        ))}

        {/* Loading skeletons */}
        {isLoading &&
          Array.from({ length: 6 }).map((_, i) => <VideoCardSkeleton key={`skeleton-${i}`} />)}
      </div>

      {/* Load more trigger / status */}
      <div ref={loadMoreRef} className="flex justify-center py-8">
        {isLoading && (
          <div className="flex items-center gap-2 text-foreground-muted">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading more videos...</span>
          </div>
        )}

        {error && (
          <div className="text-center">
            <p className="text-red-500 mb-2">{error}</p>
            <button
              onClick={loadMore}
              className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {!hasMore && videos.length > 0 && !isLoading && (
          <p className="text-foreground-muted text-sm">
            You&apos;ve reached the end! {videos.length} videos loaded.
          </p>
        )}
      </div>
    </div>
  );
}
