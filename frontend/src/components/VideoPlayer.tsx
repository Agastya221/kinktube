"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Play, Maximize2, Minimize2, AlertTriangle } from "lucide-react";
import { getDisplayThumbnailUrl } from "@/lib/media";

interface VideoPlayerProps {
  embedUrl: string;
  title: string;
  thumbnailUrl?: string;
  autoplay?: boolean;
  videoId?: number; // internal DB id — used to report unavailable embeds
}

export default function VideoPlayer({
  embedUrl,
  title,
  thumbnailUrl,
  autoplay = false,
  videoId,
}: VideoPlayerProps) {
  const [isLoaded, setIsLoaded] = useState(autoplay);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showBlockedNotice, setShowBlockedNotice] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const reportedRef = useRef(false);
  const displayThumbnailUrl = getDisplayThumbnailUrl(thumbnailUrl);

  // Modify embed URL to include autoplay if needed
  const getEmbedUrl = () => {
    const url = new URL(embedUrl);
    if (isLoaded) {
      url.searchParams.set("autoplay", "1");
    }
    return url.toString();
  };

  const handlePlay = () => {
    setIframeLoaded(false);
    setShowBlockedNotice(false);
    setIsLoaded(true);
  };

  useEffect(() => {
    if (!isLoaded || iframeLoaded) {
      return;
    }

    // If the iframe hasn't fired onLoad after 12 seconds, treat as unavailable
    const unavailableTimeout = window.setTimeout(async () => {
      setIsUnavailable(true);
      setShowBlockedNotice(false);

      // Report to backend once so it gets hidden from listings
      if (videoId && !reportedRef.current) {
        reportedRef.current = true;
        try {
          await fetch(`/api/videos/${videoId}/unavailable`, { method: "POST" });
        } catch {
          // best-effort: not critical
        }
      }
    }, 12000);

    // Show "not loading?" hint after 7s (before declaring fully unavailable)
    const hintTimeout = window.setTimeout(() => {
      setShowBlockedNotice(true);
    }, 7000);

    return () => {
      window.clearTimeout(unavailableTimeout);
      window.clearTimeout(hintTimeout);
    };
  }, [iframeLoaded, isLoaded, videoId]);

  useEffect(() => {
    const syncFullscreenState = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };

    document.addEventListener("fullscreenchange", syncFullscreenState);
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState);
    };
  }, []);

  const handleFullscreen = async () => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    try {
      if (document.fullscreenElement === container) {
        await document.exitFullscreen();
        return;
      }

      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }

      await container.requestFullscreen();
    } catch {
      setIsFullscreen(document.fullscreenElement === container);
    }
  };

  return (
    <div className="video-player-wrapper relative">
      <div
        ref={containerRef}
        className={`
          video-player-container group relative w-full overflow-hidden bg-black
          ${isFullscreen ? "fixed inset-0 z-50" : "rounded-lg"}
        `}
        style={{ aspectRatio: "16 / 9" }}
      >
        {!isLoaded && thumbnailUrl ? (
          // Thumbnail with play button overlay
          <div className="relative w-full h-full">
            <Image
              src={displayThumbnailUrl}
              alt={title}
              fill
              sizes="100vw"
              className="absolute inset-0 object-cover"
              priority
              unoptimized
            />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <button
                onClick={handlePlay}
                className="
                  w-20 h-20 sm:w-24 sm:h-24 rounded-full
                  bg-accent/90 hover:bg-accent hover:scale-110
                  flex items-center justify-center
                  transition-all duration-200
                  shadow-2xl shadow-accent/50
                "
                aria-label="Play video"
              >
                <Play className="w-10 h-10 sm:w-12 sm:h-12 text-white fill-white ml-1" />
              </button>
            </div>
          </div>
        ) : isUnavailable ? (
          // Video unavailable notice
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background-secondary text-foreground-muted gap-3">
            <AlertTriangle className="w-12 h-12 text-red-500/70" />
            <p className="text-base font-semibold text-foreground">Video Unavailable</p>
            <p className="text-sm text-center max-w-xs px-4">
              This video has been removed from the source. Our team has been notified and it will be removed from the site shortly.
            </p>
          </div>
        ) : (
          // Iframe embed
          <iframe
            src={getEmbedUrl()}
            title={title}
            allowFullScreen
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            className="absolute inset-0 w-full h-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            onLoad={() => {
              setIframeLoaded(true);
              setShowBlockedNotice(false);
            }}
          />
        )}

        {/* Fullscreen toggle button */}
        {isLoaded && (
          <button
            onClick={handleFullscreen}
            className="
              absolute bottom-4 right-4 p-2 rounded-lg
              bg-black/60 hover:bg-black/80
              text-white transition-colors
              opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100
            "
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        )}
      </div>

      {/* Video quality notice */}
      <div className="mt-2 text-xs text-foreground-muted">
        <span>HD Quality Available</span>
      </div>

      {/* Blocked region notice */}
      {isLoaded && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowBlockedNotice(!showBlockedNotice)}
            className="text-sm text-foreground-muted hover:text-accent transition-colors"
          >
            Video not loading? Click here
          </button>

          {showBlockedNotice && (
            <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm text-foreground font-medium">
                    Video blocked in your region?
                  </p>
                  <p className="text-sm text-foreground-muted">
                    Some embedded videos may be restricted in certain countries. The page and thumbnails
                    can load through our server, but playback is still controlled by the source host.
                  </p>
                  <ul className="text-sm text-foreground-muted list-disc list-inside space-y-1">
                    <li>Use a VPN to access the content</li>
                    <li>Try a different browser or network</li>
                    <li>Check your internet connection</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
