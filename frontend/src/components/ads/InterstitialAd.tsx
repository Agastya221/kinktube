"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

import { useSiteSettings } from "@/components/SiteSettingsProvider";

const INTERSTITIAL_STORAGE_KEY = "kinktube_interstitial_shown";
const CLOSE_DELAY_SECONDS = 5;

/**
 * Full-screen interstitial ad shown once per session on first video click.
 * Uses ExoClick fullpage interstitial zone.
 * Frequency: once per session only.
 */
export default function InterstitialAd() {
  const siteSettings = useSiteSettings();
  const adRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [canClose, setCanClose] = useState(false);
  const [countdown, setCountdown] = useState(CLOSE_DELAY_SECONDS);
  const hasShown = useRef(false);

  const config = siteSettings.ads.interstitial;
  const isEnabled = config?.enabled && config.zone_id.trim() !== "";

  const handleClose = useCallback(() => {
    setVisible(false);
  }, []);

  // Listen for video card clicks to trigger the interstitial
  useEffect(() => {
    if (!isEnabled) return;
    if (sessionStorage.getItem(INTERSTITIAL_STORAGE_KEY)) return;

    const handleClick = (e: MouseEvent) => {
      if (hasShown.current) return;

      // Check if the click target is inside a video card link
      const target = e.target as HTMLElement;
      const videoLink = target.closest("a.video-card");
      if (!videoLink) return;

      // Prevent default navigation
      e.preventDefault();
      e.stopPropagation();

      hasShown.current = true;
      sessionStorage.setItem(INTERSTITIAL_STORAGE_KEY, "1");
      setVisible(true);

      // Navigate after the interstitial is shown
      const href = videoLink.getAttribute("href");
      if (href) {
        // Navigate after a delay or when user closes
        const navTimer = window.setTimeout(() => {
          window.location.href = href;
        }, (CLOSE_DELAY_SECONDS + 1) * 1000);

        // Store so we can navigate early on close
        (window as unknown as Record<string, unknown>).__interstitial_href = href;
        (window as unknown as Record<string, unknown>).__interstitial_timer = navTimer;
      }
    };

    document.addEventListener("click", handleClick, { capture: true });

    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
    };
  }, [isEnabled]);

  // Close handler that also navigates
  useEffect(() => {
    if (!visible) {
      // If closed manually, navigate
      const href = (window as unknown as Record<string, unknown>).__interstitial_href as string;
      const timer = (window as unknown as Record<string, unknown>).__interstitial_timer as number;
      if (href && hasShown.current) {
        window.clearTimeout(timer);
        window.location.href = href;
      }
    }
  }, [visible]);

  // Countdown timer
  useEffect(() => {
    if (!visible) return;

    setCanClose(false);
    setCountdown(CLOSE_DELAY_SECONDS);

    const interval = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanClose(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [visible]);

  // Render ad
  useEffect(() => {
    if (!isEnabled || !visible || !adRef.current) return;

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
  }, [isEnabled, visible, config, siteSettings.ads.network]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl mx-4">
        {/* Close / countdown button */}
        <div className="flex justify-end mb-3">
          <button
            type="button"
            onClick={canClose ? handleClose : undefined}
            disabled={!canClose}
            className="flex items-center gap-2 rounded-full border border-white/20 bg-black/80 px-4 py-2 text-sm font-medium text-white transition-colors enabled:hover:bg-white/15 disabled:cursor-not-allowed disabled:text-white/50"
          >
            {canClose ? (
              <>
                <X className="w-4 h-4" />
                Close Ad
              </>
            ) : (
              `Skip in ${countdown}s`
            )}
          </button>
        </div>

        {/* Ad container */}
        <div className="rounded-xl border border-white/10 bg-zinc-950 overflow-hidden shadow-2xl">
          <div className="text-center py-2 text-xs font-medium uppercase tracking-[0.18em] text-white/40 border-b border-white/10">
            Advertisement
          </div>
          <div
            className="flex items-center justify-center min-h-[300px] md:min-h-[400px] p-4"
            ref={adRef}
          />
        </div>
      </div>
    </div>
  );
}
