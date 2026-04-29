"use client";

import { useEffect, useState } from "react";

import AdSlot from "./AdSlot";

interface AdBannerProps {
  position: "top" | "bottom" | "sidebar" | "video" | "mobile" | "above-footer" | "between-content";
  className?: string;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(mediaQuery.matches);

    sync();
    mediaQuery.addEventListener("change", sync);

    return () => {
      mediaQuery.removeEventListener("change", sync);
    };
  }, []);

  return isMobile;
}

// Wrapper component for common ad placements
export default function AdBanner({ position, className = "" }: AdBannerProps) {
  const isMobile = useIsMobile();

  // Map positions to ad formats
  const formatMap: Record<string, "banner" | "sidebar" | "video-banner" | "mobile-banner" | "above-footer" | "between-content"> = {
    top: "banner",
    bottom: "banner",
    sidebar: "sidebar",
    video: "video-banner",
    mobile: "mobile-banner",
    "above-footer": "above-footer",
    "between-content": "between-content",
  };

  if (isMobile === null) {
    return null;
  }

  if (position === "mobile" && !isMobile) {
    return null;
  }

  const format =
    (position === "top" || position === "bottom" || position === "above-footer") && isMobile
      ? "mobile-banner"
      : formatMap[position] || "banner";

  return (
    <div className={`sponsor-block sponsor-${position} ${className}`}>
      <AdSlot format={format} />
    </div>
  );
}

// Sidebar ad stack - multiple ads in sidebar
export function SidebarAds({ count = 2 }: { count?: number }) {
  return (
    <div className="sponsor-sidebar space-y-6 sticky top-20">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="sponsor-sidebar-slot">
          <AdSlot format="sidebar" />
        </div>
      ))}
    </div>
  );
}

// Sidebar ad stack with optional skyscraper at the end
export function SidebarAdsWithSkyscraper({ count = 2 }: { count?: number }) {
  return (
    <div className="sponsor-sidebar space-y-6 sticky top-20">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="sponsor-sidebar-slot">
          <AdSlot format="sidebar" />
        </div>
      ))}
      <div className="sponsor-sidebar-skyscraper">
        <AdSlot format="skyscraper" />
      </div>
    </div>
  );
}

// Native ad that blends with content
export function NativeAd({ className = "" }: { className?: string }) {
  return (
    <div className={`sponsor-native ${className}`}>
      <div className="text-xs text-foreground-muted mb-1">Sponsored</div>
      <AdSlot format="native" />
    </div>
  );
}

// Between-content ad (e.g., between video info and comments)
export function BetweenContentAd({ className = "" }: { className?: string }) {
  return (
    <div className={`sponsor-between flex justify-center ${className}`}>
      <AdSlot format="between-content" />
    </div>
  );
}

// Above-footer ad banner
export function AboveFooterAd({ className = "" }: { className?: string }) {
  return (
    <div className={`sponsor-above-footer ${className}`}>
      <AdSlot format="above-footer" />
    </div>
  );
}
