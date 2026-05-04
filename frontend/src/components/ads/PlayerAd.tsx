"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface PlayerAdProps {
  zoneId: string;
  onComplete: () => void;
}

const SKIP_SECONDS = 5;
const MAX_RETRIES = 1;

interface VastCreative {
  mediaUrl: string;
  clickThrough?: string;
  impressions: string[];
}

function buildExoClickVastUrl(value: string): string {
  const trimmed = value.trim();
  let baseUrl = trimmed;
  if (!/^https?:\/\//i.test(trimmed)) {
    baseUrl = `https://s.magsrv.com/v1/vast.php?idzone=${encodeURIComponent(trimmed)}`;
  }
  
  // Cache busting
  const url = new URL(baseUrl);
  url.searchParams.set("cb", `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
  return url.toString();
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

export default function PlayerAd({ zoneId, onComplete }: PlayerAdProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [creative, setCreative] = useState<VastCreative | null>(null);
  const [loading, setLoading] = useState(true);
  const [skipSecondsLeft, setSkipSecondsLeft] = useState(SKIP_SECONDS);
  const [canSkip, setCanSkip] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const completedRef = useRef(false);

  const completeOnce = useCallback(() => {
    if (completedRef.current) {
      return;
    }
    completedRef.current = true;
    
    // Explicitly clean up video element before unmounting
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.removeAttribute("src");
      videoRef.current.load();
    }
    
    onComplete();
  }, [onComplete]);

  const handleFetchError = useCallback(() => {
    if (retryCount < MAX_RETRIES) {
      setRetryCount((prev) => prev + 1);
    } else {
      completeOnce(); // Failed all retries, skip to video
    }
  }, [retryCount, completeOnce]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const vastUrl = buildExoClickVastUrl(zoneId);

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
      .catch((err) => {
        console.warn("VAST fetch error:", err);
        if (!cancelled) {
          handleFetchError();
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
  }, [zoneId, retryCount, handleFetchError]);

  // Only start the skip countdown once the ad has loaded and is playing.
  useEffect(() => {
    if (!creative || loading) return;
    if (skipSecondsLeft <= 0) {
      setCanSkip(true);
      return;
    }
    const timer = window.setTimeout(() => {
      setSkipSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [creative, loading, skipSecondsLeft]);

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
        ) : !creative ? null : (
          <button
            type="button"
            onClick={openClickThrough}
            className="flex h-full w-full items-center justify-center bg-black cursor-pointer"
            aria-label="Open advertiser"
          >
            <video
              ref={videoRef}
              src={creative.mediaUrl}
              autoPlay
              muted
              playsInline
              onEnded={completeOnce}
              onError={handleFetchError}
              className="h-full w-full object-contain"
            />
          </button>
        )}
      </div>

      {/* Skip button — only visible once ad has loaded and countdown is done */}
      {creative && !loading ? (
        <button
          type="button"
          onClick={canSkip ? completeOnce : undefined}
          disabled={!canSkip}
          className="absolute bottom-3 right-3 rounded-full border border-white/20 bg-black/80 px-4 py-2 text-xs font-semibold text-white transition-colors enabled:hover:bg-white/15 disabled:cursor-not-allowed disabled:text-white/50"
        >
          {canSkip ? "Skip Ad ›" : `Skip in ${skipSecondsLeft}s`}
        </button>
      ) : null}
    </div>
  );
}
