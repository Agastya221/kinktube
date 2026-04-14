"use client";

import { ExternalLink, Play, Crown, Star } from "lucide-react";

// Affiliate link type matching backend
export interface AffiliateLink {
  program: string;
  display_name: string;
  url: string;
  description: string;
  cta: string;
  logo_url?: string;
  is_primary: boolean;
}

interface AffiliateButtonsProps {
  links: AffiliateLink[];
  className?: string;
  videoTitle?: string;
}

// Main affiliate buttons component for video page
export default function AffiliateButtons({ links, className = "", videoTitle }: AffiliateButtonsProps) {
  if (!links || links.length === 0) {
    return null;
  }

  const handleClick = (link: AffiliateLink) => {
    // Track click for analytics (can be extended)
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "affiliate_click", {
        program: link.program,
        video_title: videoTitle,
      });
    }
  };

  return (
    <div className={`affiliate-buttons space-y-3 ${className}`}>
      {/* Section header */}
      <div className="flex items-center gap-2 text-sm text-foreground-muted">
        <Crown className="w-4 h-4 text-yellow-500" />
        <span>Watch the Full Premium Scene</span>
      </div>

      {/* Affiliate links */}
      <div className="flex flex-col sm:flex-row gap-3">
        {links.map((link, index) => (
          <a
            key={link.program}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer nofollow sponsored"
            onClick={() => handleClick(link)}
            className={`
              affiliate-button group flex items-center justify-center gap-3
              px-6 py-4 rounded-lg font-semibold text-white
              transition-all duration-200 transform hover:scale-[1.02]
              ${link.is_primary
                ? "bg-gradient-to-r from-accent to-red-700 hover:from-red-700 hover:to-accent shadow-lg shadow-accent/25"
                : "bg-gradient-to-r from-zinc-800 to-zinc-700 hover:from-zinc-700 hover:to-zinc-600 border border-border"
              }
              ${index === 0 ? "sm:flex-1" : ""}
            `}
          >
            {link.is_primary ? (
              <Play className="w-5 h-5 fill-current" />
            ) : (
              <Star className="w-5 h-5" />
            )}
            <span className="flex flex-col items-start">
              <span className="text-base">{link.cta}</span>
              <span className="text-xs opacity-75 font-normal">
                on {link.display_name}
              </span>
            </span>
            <ExternalLink className="w-4 h-4 ml-auto opacity-50 group-hover:opacity-100 transition-opacity" />
          </a>
        ))}
      </div>

      {/* Trust badge */}
      <p className="text-xs text-foreground-muted text-center">
        Premium HD quality • Full-length scenes • Cancel anytime
      </p>
    </div>
  );
}

// Compact affiliate link for sidebar
export function AffiliateButtonCompact({ link }: { link: AffiliateLink }) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer nofollow sponsored"
      className="
        affiliate-compact flex items-center gap-2 px-4 py-2.5 rounded-lg
        bg-accent/10 border border-accent/30 text-accent
        hover:bg-accent hover:text-white transition-all duration-200
        text-sm font-medium
      "
    >
      <Play className="w-4 h-4" />
      <span>{link.cta}</span>
    </a>
  );
}

// Inline affiliate CTA that can be placed anywhere
export function AffiliateInlineCTA({
  link,
  variant = "default",
}: {
  link: AffiliateLink;
  variant?: "default" | "minimal" | "banner";
}) {
  if (variant === "minimal") {
    return (
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer nofollow sponsored"
        className="text-accent hover:text-accent-light underline"
      >
        {link.cta} →
      </a>
    );
  }

  if (variant === "banner") {
    return (
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer nofollow sponsored"
        className="
          block w-full p-4 rounded-lg
          bg-gradient-to-r from-accent/20 to-transparent
          border border-accent/30
          hover:border-accent transition-colors
        "
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-foreground">{link.cta}</p>
            <p className="text-sm text-foreground-muted">{link.description}</p>
          </div>
          <ExternalLink className="w-5 h-5 text-accent" />
        </div>
      </a>
    );
  }

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer nofollow sponsored"
      className="
        inline-flex items-center gap-2 px-4 py-2 rounded-lg
        bg-accent text-white font-medium
        hover:bg-accent-hover transition-colors
      "
    >
      {link.cta}
      <ExternalLink className="w-4 h-4" />
    </a>
  );
}

// Declare gtag for TypeScript
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}
