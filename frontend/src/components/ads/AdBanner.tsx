"use client";

import { useEffect, useState } from "react";

import AdSlot from "./AdSlot";

interface AdBannerProps {
  position: "top" | "bottom" | "sidebar" | "video" | "mobile";
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
  const formatMap: Record<string, "banner" | "sidebar" | "video-banner" | "mobile-banner"> = {
    top: "banner",
    bottom: "banner",
    sidebar: "sidebar",
    video: "video-banner",
    mobile: "mobile-banner",
  };

  if (isMobile === null) {
    return null;
  }

  if (position === "mobile" && !isMobile) {
    return null;
  }

  const format =
    (position === "top" || position === "bottom") && isMobile
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

// Native ad that blends with content
export function NativeAd({ className = "" }: { className?: string }) {
  return (
    <div className={`sponsor-native ${className}`}>
      <div className="text-xs text-foreground-muted mb-1">Sponsored</div>
      <AdSlot format="native" />
    </div>
  );
}
