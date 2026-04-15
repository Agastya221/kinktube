import type { Video } from "@/lib/types";
import { getVideoIdentifier } from "@/lib/types";
import VideoCard, { VideoCardSkeleton } from "./VideoCard";

interface VideoGridProps {
  videos: Video[];
  loading?: boolean;
}

export default function VideoGrid({ videos, loading }: VideoGridProps) {
  if (loading) {
    return (
      <div className="video-grid">
        {Array.from({ length: 12 }).map((_, i) => (
          <VideoCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!videos || videos.length === 0) {
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
    <div className="video-grid">
      {videos.map((video) => (
        <VideoCard key={getVideoIdentifier(video)} video={video} />
      ))}
    </div>
  );
}
