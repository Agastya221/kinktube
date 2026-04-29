"use client";

import { useEffect, useRef, useState } from "react";

import { useSiteSettings } from "@/components/SiteSettingsProvider";

const STICKY_STORAGE_KEY = "kinktube_sticky_dismissed";

/**
 * Sticky banner pinned to the bottom of the mobile viewport.
 * Uses ExoClick sticky banner zone (300×100).
 * Shows globally on all pages. Dismissible per session.
 */
export default function StickyMobileBanner() {
  const siteSettings = useSiteSettings();
  const adRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const config = siteSettings.ads.sticky_mobile;
  const isEnabled = config?.enabled && config.zone_id.trim() !== "";

  useEffect(() => {
    // Only show on mobile
    const mq = window.matchMedia("(max-width: 767px)");
    if (!mq.matches) return;

    // Check if dismissed this session
    if (sessionStorage.getItem(STICKY_STORAGE_KEY)) return;

    // Small delay so it doesn't flash on page load
    const timer = window.setTimeout(() => setVisible(true), 2000);
    return () => window.clearTimeout(timer);
  }, []);

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
    sessionStorage.setItem(STICKY_STORAGE_KEY, "1");
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="relative bg-black/95 border-t border-border py-2 px-2">
        {/* Close button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute -top-7 right-2 bg-black/80 text-white/60 hover:text-white text-xs px-2 py-1 rounded-t-md border border-b-0 border-border transition-colors"
          aria-label="Close sticky ad"
        >
          ✕
        </button>
        <div className="flex items-center justify-center" ref={adRef} />
      </div>
    </div>
  );
}
