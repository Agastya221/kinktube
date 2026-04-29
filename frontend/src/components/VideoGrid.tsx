"use client";

import type { Video } from "@/lib/types";
import { getVideoIdentifier } from "@/lib/types";
import VideoCard, { VideoCardSkeleton } from "./VideoCard";
import { NativeAdCard } from "@/components/ads";

interface VideoGridProps {
  videos: Video[];
  loading?: boolean;
  /** Positions (0-indexed) at which to inject native ad cards. Default: [3, 7, 15] */
  adPositions?: number[];
}

export default function VideoGrid({ videos, loading, adPositions = [3, 7, 15] }: VideoGridProps) {
  if (loading) {
    return (
      <div className="video-grid">
        {Array.from({ length: 12 }).map((_, i) => (
          <VideoCardSkeleton key={i} />
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

  // Build the grid items with native ads injected at specified positions
  const gridItems: React.ReactNode[] = [];
  let adIndex = 0;
  const adPositionSet = new Set(adPositions);

  for (let i = 0; i < validVideos.length; i++) {
    // Insert native ad before this position if it matches
    if (adPositionSet.has(i) && adIndex < adPositions.length) {
      gridItems.push(<NativeAdCard key={`ad-${adIndex}`} />);
      adIndex++;
    }

    gridItems.push(
      <VideoCard
        key={getVideoIdentifier(validVideos[i])}
        video={validVideos[i]}
        priority={i < 2}
      />
    );
  }

  return <div className="video-grid">{gridItems}</div>;
}
