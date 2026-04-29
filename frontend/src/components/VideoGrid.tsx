"use client";

import type { Video } from "@/lib/types";
import { getVideoIdentifier } from "@/lib/types";
import VideoCard from "./VideoCard";
import NativeAdCard from "@/components/ads/NativeAdCard";

interface VideoGridProps {
  videos: Video[];
  loading?: boolean;
  /** Inject a native ad card after this many video cards. 0 = no ad. Default: 8 */
  nativeAdAfter?: number;
}

export default function VideoGrid({ videos, loading, nativeAdAfter = 8 }: VideoGridProps) {
  if (loading) {
    return (
      <div className="video-grid">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-background-tertiary rounded-lg" style={{ aspectRatio: "16 / 9" }} />
            <div className="mt-3 space-y-2">
              <div className="h-4 bg-background-tertiary rounded w-3/4" />
              <div className="h-3 bg-background-tertiary rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Filter out videos without thumbnails
  const validVideos = videos?.filter((video) => video.thumbnail || video.thumbnail_lg) || [];

  if (validVideos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-foreground-muted text-lg">No videos found</p>
        <p className="text-foreground-muted text-sm mt-2">
          Try a different search or browse our categories
        </p>
      </div>
    );
  }

  // Build the grid items with native ad injection
  const gridItems: React.ReactNode[] = [];

  for (let i = 0; i < validVideos.length; i++) {
    gridItems.push(
      <VideoCard
        key={getVideoIdentifier(validVideos[i])}
        video={validVideos[i]}
        priority={i < 2}
      />
    );

    // Inject native ad card after every N video cards
    if (nativeAdAfter > 0 && (i + 1) % nativeAdAfter === 0 && i + 1 < validVideos.length) {
      gridItems.push(
        <NativeAdCard key={`native-ad-${i}`} />
      );
    }
  }

  return <div className="video-grid">{gridItems}</div>;
}
