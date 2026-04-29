"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

import { useSiteSettings } from "@/components/SiteSettingsProvider";

const PUSH_STORAGE_KEY = "kinktube_inpage_push_shown";
const PUSH_DELAY_MS = 15000; // Show after 15 seconds
const AUTO_DISMISS_MS = 30000; // Auto-dismiss after 30 seconds

/**
 * In-page push notification that appears in the bottom-right corner.
 * Non-intrusive, high CTR, no opt-in needed.
 * Uses ExoClick in-page push zone.
 */
export default function InPagePush() {
  const siteSettings = useSiteSettings();
  const adRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const config = siteSettings.ads.in_page_push;
  const isEnabled = config?.enabled && config.zone_id.trim() !== "";

  // Delayed appearance
  useEffect(() => {
    if (!isEnabled) return;
    if (typeof window === "undefined") return;

    // Only show once per session
    if (sessionStorage.getItem(PUSH_STORAGE_KEY)) return;

    const timer = window.setTimeout(() => {
      setVisible(true);
      sessionStorage.setItem(PUSH_STORAGE_KEY, "1");
    }, PUSH_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [isEnabled]);

  // Auto-dismiss timer
  useEffect(() => {
    if (!visible || dismissed) return;
    const timer = window.setTimeout(() => setDismissed(true), AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [visible, dismissed]);

  // Render ad
  useEffect(() => {
    if (!isEnabled || !visible || dismissed || !adRef.current) return;

    const zoneId = config.zone_id.trim();
    const network = siteSettings.ads.network;

    if (network === "exoclick" && /^\d+$/.test(zoneId)) {
      adRef.current.innerHTML = "";

      const providerScript = document.createElement("script");
      providerScript.type = "text/javascript";
      providerScript.src = "https://a.magsrv.com/ad-provider.js";
      providerScript.async = true;
      adRef.current.appendChild(providerScript);

      const ins = document.createElement("ins");
      ins.className = "eas6a97888e";
      ins.setAttribute("data-zoneid", zoneId);
      adRef.current.appendChild(ins);

      const serveScript = document.createElement("script");
      serveScript.type = "text/javascript";
      serveScript.text = `(AdProvider = window.AdProvider || []).push({"serve": {}});`;
      adRef.current.appendChild(serveScript);
    }
  }, [isEnabled, visible, dismissed, config, siteSettings.ads.network]);

  if (!isEnabled || !visible || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
  };

  return (
    <div
      className="fixed bottom-4 right-4 z-[55] w-[320px] max-w-[calc(100vw-2rem)]"
      style={{
        animation: "slideInRight 0.3s ease-out",
      }}
    >
      <div className="relative bg-background-secondary rounded-xl border border-border shadow-2xl shadow-black/60 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-background-tertiary border-b border-border">
          <span className="text-xs text-foreground-muted font-medium">Sponsored</span>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 text-foreground-muted hover:text-foreground transition-colors"
            aria-label="Close notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        {/* Ad content */}
        <div className="p-3 flex items-center justify-center min-h-[80px]" ref={adRef} />
      </div>

      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
