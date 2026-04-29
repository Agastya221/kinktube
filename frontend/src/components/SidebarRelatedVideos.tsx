"use client";

import type { Video } from "@/lib/types";
import VideoCard from "@/components/VideoCard";
import NativeAdCard from "@/components/ads/NativeAdCard";

interface SidebarRelatedVideosProps {
  videos: Video[];
}

/**
 * Desktop sidebar showing related videos and a native ad card.
 * Hidden on mobile (parent uses lg:block).
 */
export default function SidebarRelatedVideos({ videos }: SidebarRelatedVideosProps) {
  if (videos.length === 0) return null;

  const topVideos = videos.slice(0, 6);
  const extraVideos = videos.slice(6, 10);

  return (
    <div className="sticky top-20 space-y-4 max-h-[calc(100vh-6rem)] overflow-y-auto scrollbar-hide pb-4">
      <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider">
        Related Videos
      </h3>

      {/* First batch of related videos */}
      {topVideos.map((v) => (
        <VideoCard key={v.id || v.external_id} video={v} />
      ))}

      {/* Native Ad Card blended in sidebar */}
      <NativeAdCard />

      {/* Extra related videos after the ad */}
      {extraVideos.map((v) => (
        <VideoCard key={v.id || v.external_id} video={v} />
      ))}
    </div>
  );
}
