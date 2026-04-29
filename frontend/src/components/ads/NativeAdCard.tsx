"use client";

import { useEffect, useRef, useState } from "react";

import { useSiteSettings } from "@/components/SiteSettingsProvider";

interface NativeAdCardProps {
  className?: string;
}

/**
 * A native ad card styled to completely blend with video cards in the grid.
 * No "AD" badge or "Sponsored Content" label — the ExoClick native widget
 * renders its own title/description which our Custom CSS styles to match VideoCard.
 */
export default function NativeAdCard({ className = "" }: NativeAdCardProps) {
  const siteSettings = useSiteSettings();
  const adRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  const config = siteSettings.ads.native;
  const isEnabled = config?.enabled && config.zone_id.trim() !== "";

  // Lazy load with IntersectionObserver
  useEffect(() => {
    if (!containerRef.current || !isEnabled || loaded) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setLoaded(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isEnabled, loaded]);

  useEffect(() => {
    if (!loaded || !adRef.current || !isEnabled) return;

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
  }, [loaded, isEnabled, config, siteSettings.ads.network]);

  if (!isEnabled) return null;

  return (
    <div ref={containerRef} className={`native-ad-card ${className}`}>
      {/* Let ExoClick render the full widget — CSS handles all the styling */}
      <div ref={adRef} className="native-ad-widget" />
    </div>
  );
}
