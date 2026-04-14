"use client";

import { useState } from "react";
import { Play, Maximize2 } from "lucide-react";

interface VideoPlayerProps {
  embedUrl: string;
  title: string;
  thumbnailUrl?: string;
  autoplay?: boolean;
}

export default function VideoPlayer({
  embedUrl,
  title,
  thumbnailUrl,
  autoplay = false,
}: VideoPlayerProps) {
  const [isLoaded, setIsLoaded] = useState(autoplay);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Modify embed URL to include autoplay if needed
  const getEmbedUrl = () => {
    const url = new URL(embedUrl);
    if (isLoaded) {
      url.searchParams.set("autoplay", "1");
    }
    return url.toString();
  };

  const handlePlay = () => {
    setIsLoaded(true);
  };

  const handleFullscreen = () => {
    const container = document.querySelector(".video-player-container");
    if (container) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
        setIsFullscreen(false);
      } else {
        container.requestFullscreen();
        setIsFullscreen(true);
      }
    }
  };

  return (
    <div className="video-player-wrapper relative">
      <div
        className={`
          video-player-container relative w-full overflow-hidden bg-black
          ${isFullscreen ? "fixed inset-0 z-50" : "rounded-lg"}
        `}
        style={{ aspectRatio: "16 / 9" }}
      >
        {!isLoaded && thumbnailUrl ? (
          // Thumbnail with play button overlay
          <div className="relative w-full h-full">
            <img
              src={thumbnailUrl}
              alt={title}
              className="absolute inset-0 w-full h-full object-cover"
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
          />
        )}

        {/* Fullscreen toggle button */}
        {isLoaded && !isFullscreen && (
          <button
            onClick={handleFullscreen}
            className="
              absolute bottom-4 right-4 p-2 rounded-lg
              bg-black/60 hover:bg-black/80
              text-white transition-colors
              opacity-0 group-hover:opacity-100
            "
            aria-label="Toggle fullscreen"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Video quality notice */}
      <div className="mt-2 flex items-center justify-between text-xs text-foreground-muted">
        <span>HD Quality Available</span>
        <span>Powered by Eporner</span>
      </div>
    </div>
  );
}
