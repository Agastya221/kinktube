"use client";

import { useCallback, useState } from "react";
import { PlayerAd } from "@/components/ads";

interface VideoPlayerProps {
  embedUrl: string;
  title: string;
}

function withAutoplay(embedUrl: string): string {
  try {
    const url = new URL(embedUrl);
    url.searchParams.set("autoplay", "1");
    return url.toString();
  } catch {
    return embedUrl;
  }
}

export default function VideoPlayer({ embedUrl, title }: VideoPlayerProps) {
  const [canPlay, setCanPlay] = useState(false);
  const handleAdComplete = useCallback(() => {
    setCanPlay(true);
  }, []);

  return (
    <div className="video-player-wrapper relative">
      <div
        className="relative w-full overflow-hidden rounded-lg bg-black"
        style={{ aspectRatio: "16 / 9" }}
      >
        {canPlay ? (
          <iframe
            src={withAutoplay(embedUrl)}
            title={title}
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : null}
        {!canPlay ? <PlayerAd onComplete={handleAdComplete} /> : null}
      </div>
    </div>
  );
}
