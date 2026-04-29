"use client";

import { useState } from "react";
import type { Video } from "@/lib/types";
import VideoGrid from "./VideoGrid";
import { Loader2 } from "lucide-react";
import { getRelatedVideos } from "@/lib/api";
import { NativeAd } from "@/components/ads";

interface PaginatedRelatedVideosProps {
  videoId: number;
  initialVideos: Video[];
}

export default function PaginatedRelatedVideos({
  videoId,
  initialVideos,
}: PaginatedRelatedVideosProps) {
  const [videos, setVideos] = useState<Video[]>(initialVideos);
  const [page, setPage] = useState(2);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialVideos.length >= 24);

  const loadMore = async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    try {
      const data = await getRelatedVideos(videoId, 24, page);
      const newVideos = data.videos || [];
      
      if (newVideos.length === 0) {
        setHasMore(false);
      } else {
        setVideos((prev) => [...prev, ...newVideos]);
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
  };

  if (videos.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
        <span className="w-1.5 h-8 bg-accent rounded-full" />
        More Videos Like This
      </h2>
      
      <VideoGrid videos={videos} />

      {/* Ad after related videos */}
      {videos.length > 12 && (
        <div className="my-8 flex justify-center">
          <NativeAd className="max-w-sm" />
        </div>
      )}

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
