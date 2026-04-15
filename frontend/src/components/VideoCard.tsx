"use client";

import Link from "next/link";
import Image from "next/image";
import { Eye, Clock, Star } from "lucide-react";
import { useState } from "react";
import type { Video } from "@/lib/types";
import { formatViews, formatDuration, formatRelativeTime, getVideoPath } from "@/lib/types";

interface VideoCardProps {
  video: Video;
  priority?: boolean;
}

export default function VideoCard({ video, priority = false }: VideoCardProps) {
  const [imageError, setImageError] = useState(false);

  // Fallback thumbnail URL
  const thumbnailUrl = imageError
    ? "/placeholder-video.svg"
    : video.thumbnail_lg || video.thumbnail;

  // Check if video has extreme content based on title
  const isExtreme = /extreme|severe|brutal|intense|harsh|torture|punishment|tight bondage|predicament|mummification/i.test(video.title);

  return (
    <Link
      href={getVideoPath(video)}
      className="video-card block group focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg"
      prefetch={false}
    >
      {/* Thumbnail */}
      <div className="thumbnail-container bg-background-tertiary relative overflow-hidden rounded-lg">
        <Image
          src={thumbnailUrl}
          alt={video.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          loading={priority ? "eager" : "lazy"}
          priority={priority}
          onError={() => setImageError(true)}
          quality={75}
        />

        {/* Hover Overlay */}
        <div className="video-overlay absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-accent/90 flex items-center justify-center transform scale-90 group-hover:scale-100 transition-transform duration-200">
            <svg
              className="w-7 h-7 sm:w-8 sm:h-8 text-white ml-1"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>

        {/* Duration Badge */}
        <span className="duration-badge">
          {video.duration_str || formatDuration(video.duration)}
        </span>

        {/* Extreme Badge */}
        {isExtreme && (
          <span className="absolute top-2 left-2 bg-red-600/95 text-white text-xs px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
            Extreme
          </span>
        )}

        {/* Rating Badge (if high rating and not extreme) */}
        {!isExtreme && video.rating >= 4.5 && (
          <span className="absolute top-2 left-2 bg-yellow-500/90 text-black text-xs px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
            <Star className="w-3 h-3 fill-current" />
            {video.rating.toFixed(1)}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="mt-2 space-y-1.5">
        <h3 className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-accent transition-colors leading-snug">
          {video.title}
        </h3>

        <div className="flex items-center gap-3 text-xs text-foreground-muted">
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {formatViews(video.views)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatRelativeTime(video.published_at || video.added_at)}
          </span>
        </div>

        {/* Categories */}
        {video.categories && video.categories.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {video.categories.slice(0, 2).map((cat) => (
              <span
                key={cat}
                className="text-xs px-1.5 py-0.5 bg-background-tertiary text-foreground-muted rounded capitalize"
              >
                {cat.replace("-", " ")}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

// Skeleton loader for video cards
export function VideoCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="thumbnail-container skeleton rounded-lg" />
      <div className="mt-2 space-y-2">
        <div className="h-4 skeleton w-full rounded" />
        <div className="h-4 skeleton w-3/4 rounded" />
        <div className="h-3 skeleton w-1/2 rounded" />
      </div>
    </div>
  );
}

// Compact video card for sidebars
export function VideoCardCompact({ video }: VideoCardProps) {
  return (
    <Link
      href={getVideoPath(video)}
      className="flex gap-3 group"
      prefetch={false}
    >
      <div className="relative w-28 sm:w-32 flex-shrink-0">
        <div className="thumbnail-container">
          <Image
            src={video.thumbnail}
            alt={video.title}
            fill
            sizes="128px"
            className="object-cover rounded-lg"
            loading="lazy"
            quality={60}
          />
          <span className="duration-badge text-[10px] px-1 py-0.5">
            {video.duration_str || formatDuration(video.duration)}
          </span>
        </div>
      </div>
      <div className="flex-1 min-w-0 py-0.5">
        <h3 className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-accent transition-colors">
          {video.title}
        </h3>
        <p className="text-xs text-foreground-muted mt-1">
          {formatViews(video.views)} views
        </p>
      </div>
    </Link>
  );
}
