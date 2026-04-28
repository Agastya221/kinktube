"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSiteSettings } from "@/components/SiteSettingsProvider";

// Ad network configurations
export type AdNetwork = "exoclick" | "trafficjunky" | "juicyads" | "custom";
export type AdFormat = "banner" | "sidebar" | "native" | "popunder" | "video-banner" | "mobile-banner";

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

  if (config.format === "popunder") {
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

export default function AdSlot({ format, className = "", fallback }: AdSlotProps) {
  const siteSettings = useSiteSettings();
  const config = useMemo(
    () => getAdConfig(format, siteSettings),
    [format, siteSettings]
  );
  const adRef = useRef<HTMLDivElement>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!config || !adRef.current) {
      setHasError(true);
      return;
    }

    // Don't render popunders in the DOM directly
    if (format === "popunder") {
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
  }, [config, format, siteSettings]);

  // Responsive sizing classes based on format
  const sizeClasses: Record<AdFormat, string> = {
    "banner": siteSettings.ads.network === "juicyads"
      ? "w-full max-w-[728px] h-[102px] mx-auto"
      : "w-full max-w-[728px] h-[90px] mx-auto",
    "sidebar": "w-[300px] h-[250px]",
    "native": "w-full max-w-[300px] min-h-[250px]",
    "popunder": "hidden",
    "video-banner": "w-[308px] max-w-[92vw] h-[298px] mx-auto",
    "mobile-banner": "w-full max-w-[320px] min-h-[100px] mx-auto md:hidden",
  };

  if (!config) {
    return fallback ? <>{fallback}</> : null;
  }

  if (hasError && fallback) {
    return <>{fallback}</>;
  }

  return (
    <div
      className={`sponsor-placement ${sizeClasses[format]} ${className}`}
      data-placement={format}
    >
      <div
        ref={adRef}
        className="relative z-10 flex h-full w-full items-center justify-center"
      />
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
