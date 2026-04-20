"use client";

import { useState, useEffect } from "react";
import { X, Info } from "lucide-react";
import { useSiteSettings } from "./SiteSettingsProvider";

const DISCLAIMER_DISMISSED_KEY = "kinktube_disclaimer_dismissed";

export default function DisclaimerBanner() {
  const siteSettings = useSiteSettings();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if already dismissed this session
    const dismissed = sessionStorage.getItem(DISCLAIMER_DISMISSED_KEY);
    if (!dismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem(DISCLAIMER_DISMISSED_KEY, "true");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="bg-zinc-900 border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-foreground-muted">
            <Info className="w-4 h-4 flex-shrink-0" />
            <p>
              <span className="hidden sm:inline">
                {siteSettings.content.disclaimer_text}{" "}
              </span>
              <span className="sm:hidden">{siteSettings.content.disclaimer_text}</span>
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 text-foreground-muted hover:text-foreground transition-colors"
            aria-label="Dismiss disclaimer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
