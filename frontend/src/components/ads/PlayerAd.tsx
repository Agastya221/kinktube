"use client";

import { useEffect, useState } from "react";

import AdSlot from "./AdSlot";
import { useSiteSettings } from "@/components/SiteSettingsProvider";

interface PlayerAdProps {
  onComplete: () => void;
}

const PREROLL_SECONDS = 8;

export default function PlayerAd({ onComplete }: PlayerAdProps) {
  const siteSettings = useSiteSettings();
  const [secondsLeft, setSecondsLeft] = useState(PREROLL_SECONDS);
  const videoAdEnabled =
    siteSettings.ads.video_banner.enabled &&
    siteSettings.ads.video_banner.zone_id.trim() !== "";

  useEffect(() => {
    if (!videoAdEnabled) {
      onComplete();
    }
  }, [onComplete, videoAdEnabled]);

  useEffect(() => {
    if (!videoAdEnabled || secondsLeft <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSecondsLeft((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [secondsLeft, videoAdEnabled]);

  if (!videoAdEnabled) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black px-3 sm:px-6">
      <div className="flex w-full max-w-2xl flex-col items-center justify-center rounded-xl border border-white/10 bg-zinc-950 px-3 py-4 shadow-2xl sm:px-6 sm:py-6">
        <div className="mb-3 hidden text-xs font-medium uppercase tracking-[0.18em] text-white/50 sm:block">
          Advertisement
        </div>
        <div className="w-[308px] max-w-[92vw] overflow-hidden rounded-md bg-black">
          <AdSlot format="video-banner" />
        </div>
      </div>
      <div className="mt-3 flex h-9 items-center justify-center">
        <button
          type="button"
          onClick={secondsLeft === 0 ? onComplete : undefined}
          disabled={secondsLeft > 0}
          className="rounded-full border border-border bg-background/90 px-4 py-2 text-xs font-semibold text-foreground transition-colors enabled:hover:border-accent enabled:hover:text-accent disabled:cursor-not-allowed disabled:text-foreground-muted"
        >
          {secondsLeft > 0 ? `Continue in ${secondsLeft}` : "Continue to Video"}
        </button>
      </div>
    </div>
  );
}
