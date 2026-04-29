"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSiteSettings } from "@/components/SiteSettingsProvider";

// Ad network configurations
export type AdNetwork = "exoclick" | "trafficjunky" | "juicyads" | "custom";
export type AdFormat =
  | "banner"
  | "sidebar"
  | "native"
  | "popunder"
  | "video-banner"
  | "mobile-banner"
  | "sticky-mobile"
  | "in-page-push"
  | "interstitial"
  | "skyscraper"
  | "above-footer"
  | "between-content";

interface AdConfig {
  network: AdNetwork;
  zoneId: string;
  format: AdFormat;
  width?: number;
  height?: number;
  customCode?: string; // For custom HTML/JS ad code
}

interface AdSlotProps {
  format: AdFormat;
  className?: string;
  fallback?: React.ReactNode;
  lazy?: boolean; // If true, only load when visible (default: true)
}

const getAdConfig = (
  format: AdFormat,
  siteSettings: ReturnType<typeof useSiteSettings>
): AdConfig | null => {
  const network = siteSettings.ads.network;

  const slotConfig = {
    "banner": siteSettings.ads.banner,
    "sidebar": siteSettings.ads.sidebar,
    "native": siteSettings.ads.native,
    "popunder": siteSettings.ads.popunder,
    "video-banner": siteSettings.ads.video_banner,
    "mobile-banner": siteSettings.ads.mobile_banner,
    "sticky-mobile": siteSettings.ads.sticky_mobile,
    "in-page-push": siteSettings.ads.in_page_push,
    "interstitial": siteSettings.ads.interstitial,
    "skyscraper": siteSettings.ads.skyscraper,
    "above-footer": siteSettings.ads.above_footer,
    "between-content": siteSettings.ads.between_content,
  }[format];

  const zoneId = slotConfig?.zone_id;
  if (!slotConfig?.enabled || !zoneId) return null;

  // Default dimensions per format
  const dimensions: Record<AdFormat, { width: number; height: number }> = {
    "banner": { width: 728, height: network === "juicyads" ? 102 : 90 },
    "sidebar": { width: 300, height: 250 },
    "native": { width: 300, height: 250 },
    "popunder": { width: 0, height: 0 },
    "video-banner": { width: 308, height: 298 },
    "mobile-banner": { width: 300, height: 100 },
    "sticky-mobile": { width: 300, height: 100 },
    "in-page-push": { width: 0, height: 0 },
    "interstitial": { width: 0, height: 0 },
    "skyscraper": { width: 160, height: 600 },
    "above-footer": { width: 728, height: 90 },
    "between-content": { width: 300, height: 250 },
  };

  return {
    network,
    zoneId,
    format,
    ...dimensions[format],
  };
};

function isNumericZoneId(zoneId: string): boolean {
  return /^\d+$/.test(zoneId.trim());
}

function appendScript(parent: HTMLElement, options: { src?: string; text?: string; attrs?: Record<string, string> }) {
  const script = document.createElement("script");
  script.type = "text/javascript";

  if (options.src) {
    script.src = options.src;
  }
  if (options.text) {
    script.text = options.text;
  }
  if (options.attrs) {
    Object.entries(options.attrs).forEach(([key, value]) => {
      script.setAttribute(key, value);
    });
  }

  parent.appendChild(script);
}

function renderJuicyAds(parent: HTMLElement, config: AdConfig): boolean {
  const zoneId = config.zoneId.trim();

  if (config.format === "popunder") {
    return false;
  }

  if (!isNumericZoneId(zoneId)) {
    return false;
  }

  if (config.format === "native") {
    appendScript(parent, {
      src: "https://js.juicyads.com/juicyads.native-ads.min.js",
      attrs: {
        "data-cfasync": "false",
        "data-id": "juicyads-native-ads",
        "data-ad-zone": zoneId,
        "data-targets": "a",
      },
    });
    return true;
  }

  appendScript(parent, {
    src: "https://poweredby.jads.co/js/jads.js",
    attrs: {
      async: "async",
      "data-cfasync": "false",
    },
  });

  const ins = document.createElement("ins");
  ins.id = zoneId;
  ins.setAttribute("data-width", String(config.width || 300));
  ins.setAttribute("data-height", String(config.height || 250));
  parent.appendChild(ins);

  appendScript(parent, {
    text: `(adsbyjuicy = window.adsbyjuicy || []).push({'adzone':${zoneId}});`,
  });

  return true;
}

function renderExoClick(parent: HTMLElement, config: AdConfig): boolean {
  const zoneId = config.zoneId.trim();

  if (config.format === "popunder" || config.format === "in-page-push" || config.format === "interstitial") {
    return false;
  }

  if (!isNumericZoneId(zoneId)) {
    return false;
  }

  appendScript(parent, {
    src: "https://a.magsrv.com/ad-provider.js",
    attrs: {
      async: "async",
    },
  });

  const ins = document.createElement("ins");
  ins.className = "eas6a97888e";
  ins.setAttribute("data-zoneid", zoneId);
  parent.appendChild(ins);

  appendScript(parent, {
    text: `(AdProvider = window.AdProvider || []).push({"serve": {}});`,
  });

  return true;
}

// Generate ad code based on network
const generateAdCode = (config: AdConfig): string => {
  switch (config.network) {
    case "exoclick":
      return "";

    case "trafficjunky":
      return `
        <script type="text/javascript">
          var ad_id = "${config.zoneId}";
        </script>
        <script type="text/javascript" src="https://cdn.trafficjunky.net/js/trafjs.js"></script>
      `;

    case "juicyads":
      return "";

    case "custom":
      return config.customCode || "";

    default:
      return "";
  }
};

export default function AdSlot({ format, className = "", fallback, lazy = true }: AdSlotProps) {
  const siteSettings = useSiteSettings();
  const config = useMemo(
    () => getAdConfig(format, siteSettings),
    [format, siteSettings]
  );
  const adRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasError, setHasError] = useState(false);
  const [isVisible, setIsVisible] = useState(!lazy);

  // IntersectionObserver for lazy loading
  useEffect(() => {
    if (!lazy || !containerRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [lazy]);

  useEffect(() => {
    if (!config || !adRef.current || !isVisible) {
      if (!config) setHasError(true);
      return;
    }

    // Don't render popunders / in-page-push / interstitials in the DOM directly
    if (format === "popunder" || format === "in-page-push" || format === "interstitial") {
      return;
    }

    try {
      setHasError(false);
      adRef.current.innerHTML = "";

      if (config.network === "juicyads") {
        if (!renderJuicyAds(adRef.current, config)) {
          setHasError(true);
          return;
        }
      } else if (config.network === "exoclick") {
        if (!renderExoClick(adRef.current, config)) {
          setHasError(true);
          return;
        }
      } else {
        const adCode = generateAdCode(config);
        adRef.current.innerHTML = adCode;

        // Execute any scripts in the ad code
        const scripts = adRef.current.getElementsByTagName("script");
        Array.from(scripts).forEach((oldScript) => {
          const newScript = document.createElement("script");
          if (oldScript.src) {
            newScript.src = oldScript.src;
          } else {
            newScript.textContent = oldScript.textContent;
          }
          newScript.type = "text/javascript";
          oldScript.parentNode?.replaceChild(newScript, oldScript);
        });
      }

    } catch {
      setHasError(true);
    }
  }, [config, format, siteSettings, isVisible]);

  // Responsive sizing classes based on format
  const sizeClasses: Record<AdFormat, string> = {
    "banner": siteSettings.ads.network === "juicyads"
      ? "w-full max-w-[728px] h-[102px] mx-auto"
      : "w-full max-w-[728px] h-[90px] mx-auto",
    "sidebar": "w-[300px] h-[250px]",
    "native": "w-full max-w-[300px] min-h-[250px]",
    "popunder": "hidden",
    "video-banner": "w-[308px] max-w-[92vw] h-[298px] mx-auto",
    "mobile-banner": "w-full max-w-[300px] min-h-[250px] mx-auto",
    "sticky-mobile": "w-full max-w-[300px] h-[100px] mx-auto",
    "in-page-push": "hidden",
    "interstitial": "hidden",
    "skyscraper": "w-[160px] h-[600px]",
    "above-footer": siteSettings.ads.network === "juicyads"
      ? "w-full max-w-[728px] h-[102px] mx-auto"
      : "w-full max-w-[728px] h-[90px] mx-auto",
    "between-content": "w-full max-w-[300px] min-h-[250px] mx-auto",
  };

  if (!config) {
    return fallback ? <>{fallback}</> : null;
  }

  if (hasError && fallback) {
    return <>{fallback}</>;
  }

  return (
    <div
      ref={containerRef}
      className={`sponsor-placement ${sizeClasses[format]} ${className}`}
      data-placement={format}
    >
      {isVisible ? (
        <div
          ref={adRef}
          className="relative z-10 flex h-full w-full items-center justify-center"
        />
      ) : (
        <div className="h-full w-full" />
      )}
    </div>
  );
}

// Popunder component - triggers on user interaction
export function PopunderAd() {
  const siteSettings = useSiteSettings();
  const hasTriggered = useRef(false);

  useEffect(() => {
    const zoneId = siteSettings.ads.popunder.zone_id;
    if (!siteSettings.ads.popunder.enabled) return;
    if (!zoneId || hasTriggered.current) return;

    const handleClick = () => {
      if (hasTriggered.current) return;
      hasTriggered.current = true;

      const network = siteSettings.ads.network;

      if (network === "juicyads") {
        if (/^https?:\/\//i.test(zoneId)) {
          window.open(zoneId, "_blank", "noopener,noreferrer");
        }
        return;
      }

      if (network === "exoclick") {
        const script = document.createElement("script");
        script.src = `https://a.magsrv.com/punder.php?idzone=${zoneId}`;
        script.async = true;
        document.body.appendChild(script);
      }
    };

    // Trigger on first user interaction
    document.addEventListener("click", handleClick, { once: true });

    return () => {
      document.removeEventListener("click", handleClick);
    };
  }, [siteSettings]);

  return null;
}
