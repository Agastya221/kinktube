"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import AdSlot from "./AdSlot";
import { useSiteSettings } from "@/components/SiteSettingsProvider";

interface PlayerAdProps {
  onComplete: () => void;
}

const PREROLL_SECONDS = 8;

interface VastCreative {
  mediaUrl: string;
  clickThrough?: string;
  impressions: string[];
}

function buildExoClickVastUrl(value: string): string {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://s.magsrv.com/v1/vast.php?idzone=${encodeURIComponent(trimmed)}`;
}

function textFromElement(parent: Element | Document, selector: string): string {
  return parent.querySelector(selector)?.textContent?.trim() || "";
}

function parseVast(xml: string): VastCreative | null {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  const parserError = document.querySelector("parsererror");
  if (parserError) {
    return null;
  }

  const mediaFiles = Array.from(document.querySelectorAll("MediaFile"));
  const mp4Media =
    mediaFiles.find((file) => file.getAttribute("type")?.toLowerCase().includes("mp4")) ||
    mediaFiles.find((file) => file.textContent?.trim());
  const mediaUrl = mp4Media?.textContent?.trim();

  if (!mediaUrl) {
    return null;
  }

  return {
    mediaUrl,
    clickThrough: textFromElement(document, "VideoClicks ClickThrough"),
    impressions: Array.from(document.querySelectorAll("Impression"))
      .map((node) => node.textContent?.trim() || "")
      .filter(Boolean),
  };
}

function trackPixels(urls: string[]) {
  urls.forEach((url) => {
    const pixel = new Image();
    pixel.referrerPolicy = "no-referrer-when-downgrade";
    pixel.src = url;
  });
}

function ExoClickVastPreroll({
  zoneId,
  onComplete,
}: {
  zoneId: string;
  onComplete: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [creative, setCreative] = useState<VastCreative | null>(null);
  const [loading, setLoading] = useState(true);
  const completedRef = useRef(false);
  const vastUrl = useMemo(() => buildExoClickVastUrl(zoneId), [zoneId]);

  const completeOnce = useCallback(() => {
    if (completedRef.current) {
      return;
    }

    completedRef.current = true;
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    let cancelled = false;

    fetch(vastUrl, { cache: "no-store", credentials: "omit" })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`VAST failed: ${response.status}`);
        }
        return response.text();
      })
      .then((xml) => {
        if (cancelled) return;
        const nextCreative = parseVast(xml);
        if (!nextCreative) {
          throw new Error("No playable VAST media file");
        }
        setCreative(nextCreative);
        trackPixels(nextCreative.impressions);
      })
      .catch(() => {
        if (!cancelled) {
          completeOnce();
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [completeOnce, vastUrl]);


  const openClickThrough = () => {
    if (creative?.clickThrough) {
      window.open(creative.clickThrough, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black">
      <div className="relative flex h-full w-full items-center justify-center">
        {loading ? (
          <div className="text-sm text-white/60">Loading ad...</div>
        ) : !creative ? (
          null
        ) : (
          <button
            type="button"
            onClick={openClickThrough}
            className="flex h-full w-full items-center justify-center bg-black"
            aria-label="Open advertiser"
          >
            <video
              ref={videoRef}
              src={creative.mediaUrl}
              autoPlay
              muted
              playsInline
              onEnded={completeOnce}
              onError={completeOnce}
              className="h-full w-full object-contain"
            />
          </button>
        )}
      </div>


    </div>
  );
}

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

  if (siteSettings.ads.network === "exoclick") {
    return (
      <ExoClickVastPreroll
        zoneId={siteSettings.ads.video_banner.zone_id}
        onComplete={onComplete}
      />
    );
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
