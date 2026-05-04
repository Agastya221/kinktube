"use client";

import { useCallback, useEffect, useState } from "react";
import { PlayerAd } from "@/components/ads";
import { useSiteSettings } from "@/components/SiteSettingsProvider";

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
  const siteSettings = useSiteSettings();

  // Determine if video ads are correctly configured
  const isAdEnabled =
    siteSettings.ads.network === "exoclick" &&
    siteSettings.ads.video_banner.enabled &&
    siteSettings.ads.video_banner.zone_id.trim() !== "";

  // Reset ad playback state on video change
  useEffect(() => {
    // If ads are disabled or missing zone ID, allow immediate playback
    setCanPlay(!isAdEnabled);
  }, [embedUrl, isAdEnabled]);

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
        
        {/* Render ad player unless we are ready to play main content */}
        {!canPlay && isAdEnabled ? (
          <PlayerAd
            key={embedUrl} // Forces React to completely remount the ad on video change
            zoneId={siteSettings.ads.video_banner.zone_id.trim()}
            onComplete={handleAdComplete}
          />
        ) : null}
      </div>
    </div>
  );
}
