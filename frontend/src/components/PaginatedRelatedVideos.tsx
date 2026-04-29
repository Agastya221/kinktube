"use client";

import { useState, useCallback } from "react";
import type { Video } from "@/lib/types";
import { getVideoIdentifier } from "@/lib/types";
import VideoGrid from "./VideoGrid";
import { Loader2 } from "lucide-react";
import { getRelatedVideos } from "@/lib/api";

interface PaginatedRelatedVideosProps {
  videoId: number;
  initialVideos: Video[];
}

/**
 * Build a set of dedup keys for a video to catch duplicates
 * that have different IDs but are the same content.
 */
function getVideoDedupKeys(video: Video): string[] {
  const keys: string[] = [];

  if (video.external_id) {
    keys.push(`ext:${video.external_id}`);
  }

  if (video.source_url) {
    keys.push(`src:${video.source_url.toLowerCase()}`);
  }

  if (video.embed_url) {
    keys.push(`emb:${video.embed_url.toLowerCase()}`);
  }

  const title = video.title.toLowerCase().trim().replace(/\s+/g, " ");
  if (title) {
    keys.push(`td:${title}|${video.duration}`);
    const thumb = (video.thumbnail_lg || video.thumbnail || "").toLowerCase();
    if (thumb) {
      keys.push(`tt:${title}|${thumb}`);
    }
  }

  return keys;
}

function deduplicateVideos(videos: Video[]): Video[] {
  const seen = new Set<string>();
  const result: Video[] = [];

  for (const video of videos) {
    // Skip videos without thumbnails
    if (!video.thumbnail && !video.thumbnail_lg) {
      continue;
    }

    const keys = getVideoDedupKeys(video);
    if (keys.some((key) => seen.has(key))) {
      continue;
    }

    keys.forEach((key) => seen.add(key));
    result.push(video);
  }

  return result;
}

export default function PaginatedRelatedVideos({
  videoId,
  initialVideos,
}: PaginatedRelatedVideosProps) {
  const [videos, setVideos] = useState<Video[]>(() => deduplicateVideos(initialVideos));
  const [page, setPage] = useState(2);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialVideos.length >= 24);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    try {
      const data = await getRelatedVideos(videoId, 24, page);
      const newVideos = data.videos || [];
      
      if (newVideos.length === 0) {
        setHasMore(false);
      } else {
        setVideos((prev) => {
          const merged = [...prev, ...newVideos];
          return deduplicateVideos(merged);
        });
        setPage((p) => p + 1);
        if (newVideos.length < 24) {
          setHasMore(false);
        }
      }
    } catch (error) {
      console.error("Error loading more videos:", error);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, videoId, page]);

  if (videos.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
        <span className="w-1.5 h-8 bg-accent rounded-full" />
        More Videos Like This
      </h2>
      
      <VideoGrid videos={videos} />

      {hasMore && (
        <div className="mt-10 text-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-background-tertiary hover:bg-accent hover:text-white text-foreground rounded-full transition-all duration-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading...
              </>
            ) : (
              "Load More Videos"
            )}
          </button>
        </div>
      )}
    </section>
  );
}
