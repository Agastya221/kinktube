"use client";

import Script from "next/script";

declare global {
  interface Window {
    umami?: {
      track: (event: string | { name: string; url?: string }, data?: Record<string, string | number | undefined>) => void;
    };
  }
}

const UMAMI_URL = process.env.NEXT_PUBLIC_UMAMI_URL;
const UMAMI_ID = process.env.NEXT_PUBLIC_UMAMI_ID;

export default function Analytics() {
  if (!UMAMI_URL || !UMAMI_ID) return null;

  return (
    <Script
      defer
      src={`${UMAMI_URL}/script.js`}
      data-website-id={UMAMI_ID}
      strategy="afterInteractive"
    />
  );
}

// Track custom events with Umami
export function trackEvent(action: string, category: string, label?: string, value?: number) {
  if (typeof window !== "undefined" && window.umami) {
    window.umami.track(action, {
      category: category,
      label: label,
      value: value,
    });
  }
}

// Track page views (Umami handles this automatically)
export function trackPageView(url: string) {
  if (typeof window !== "undefined" && window.umami) {
    window.umami.track({ name: "page_view", url: url });
  }
}
