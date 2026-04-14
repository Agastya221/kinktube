"use client";

import AdSlot from "./AdSlot";

interface AdBannerProps {
  position: "top" | "bottom" | "sidebar" | "video" | "mobile";
  className?: string;
}

// Wrapper component for common ad placements
export default function AdBanner({ position, className = "" }: AdBannerProps) {
  // Map positions to ad formats
  const formatMap: Record<string, "banner" | "sidebar" | "video-banner" | "mobile-banner"> = {
    top: "banner",
    bottom: "banner",
    sidebar: "sidebar",
    video: "video-banner",
    mobile: "mobile-banner",
  };

  const format = formatMap[position] || "banner";

  return (
    <div className={`ad-banner ad-${position} ${className}`}>
      <AdSlot format={format} />
      {/* Mobile fallback for desktop banners */}
      {(position === "top" || position === "bottom") && (
        <div className="md:hidden">
          <AdSlot format="mobile-banner" />
        </div>
      )}
    </div>
  );
}

// Sidebar ad stack - multiple ads in sidebar
export function SidebarAds({ count = 2 }: { count?: number }) {
  return (
    <div className="sidebar-ads space-y-6 sticky top-20">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="sidebar-ad-slot">
          <AdSlot format="sidebar" />
        </div>
      ))}
    </div>
  );
}

// Native ad that blends with content
export function NativeAd({ className = "" }: { className?: string }) {
  return (
    <div className={`native-ad ${className}`}>
      <div className="text-xs text-foreground-muted mb-1">Sponsored</div>
      <AdSlot format="native" />
    </div>
  );
}
