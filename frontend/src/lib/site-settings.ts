import type { CSSProperties } from "react";

import type { PublicSiteSettings } from "./types";

export const fallbackPublicSiteSettings: PublicSiteSettings = {
  branding: {
    site_name: "KinkTube",
    logo_primary: "Kink",
    logo_secondary: "Tube",
    site_tagline: "The underground destination for extreme BDSM, hardcore femdom, intense bondage, and severe fetish content.",
    hero_accent: "Extreme",
    hero_title: "BDSM & Hardcore Fetish",
    hero_description: "Dive into intense femdom, predicament bondage, severe discipline, mummification, and hardcore fetish scenes. Curated for serious kink enthusiasts. Not your average tube site.",
    footer_description: "The premier destination for BDSM, kink, and fetish video content. All videos are embedded from external sources.",
    copyright_label: "KinkTube",
  },
  theme: {
    background: "#0a0a0a",
    background_secondary: "#111111",
    background_tertiary: "#1a1a1a",
    foreground: "#fafafa",
    foreground_muted: "#a1a1aa",
    accent: "#dc2626",
    accent_hover: "#b91c1c",
    accent_light: "#ef4444",
    border: "#27272a",
    border_hover: "#3f3f46",
  },
  seo: {
    site_url: process.env.SITE_URL || "https://yourdomain.com",
    default_title: "KinkTube - Extreme BDSM & Hardcore Fetish Videos",
    title_template: "%s | KinkTube",
    default_description: "The underground destination for extreme BDSM, hardcore femdom, intense bondage, and severe fetish content.",
    default_keywords: ["extreme BDSM", "hardcore femdom", "bondage", "fetish", "kink"],
    open_graph_title: "KinkTube - Extreme BDSM & Hardcore Fetish Videos",
    open_graph_description: "The underground destination for extreme BDSM, hardcore femdom, intense bondage, and severe fetish content.",
    twitter_title: "KinkTube - Extreme BDSM & Hardcore Fetish Videos",
    twitter_description: "The underground destination for extreme BDSM, hardcore femdom, intense bondage, and severe fetish content.",
  },
  content: {
    videos_per_page: 24,
    related_videos: 24,
    show_disclaimer: true,
    disclaimer_text: "This site contains adult content. All performers are 18+. We do not host any videos - all content is embedded from third-party sources.",
    enable_age_gate: true,
    enable_popunder_ads: true,
  },
  ads: {
    network: "exoclick",
    banner: { enabled: false, zone_id: "", label: "Top / Bottom Banner" },
    sidebar: { enabled: false, zone_id: "", label: "Sidebar" },
    native: { enabled: false, zone_id: "", label: "Native Sponsored Block" },
    popunder: { enabled: false, zone_id: "", label: "Popunder" },
    video_banner: { enabled: false, zone_id: "", label: "Video Page Banner" },
    mobile_banner: { enabled: false, zone_id: "", label: "Mobile Banner" },
  },
  legal: {
    terms: { title: "Terms of Service", content: "" },
    privacy: { title: "Privacy Policy", content: "" },
    dmca: { title: "DMCA Notice & Takedown Policy", content: "" },
    compliance_2257: { title: "18 U.S.C. 2257 Compliance Statement", content: "" },
  },
};

function hexToRgbTriplet(value: string, fallback: string): string {
  const normalized = value.trim();
  const hex = normalized.startsWith("#") ? normalized.slice(1) : normalized;
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    return fallback;
  }

  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

export function themeStyleFromSettings(settings: PublicSiteSettings): CSSProperties & Record<string, string> {
  const theme = settings.theme;

  return {
    "--color-background": hexToRgbTriplet(theme.background, "10 10 10"),
    "--color-background-secondary": hexToRgbTriplet(theme.background_secondary, "17 17 17"),
    "--color-background-tertiary": hexToRgbTriplet(theme.background_tertiary, "26 26 26"),
    "--color-foreground": hexToRgbTriplet(theme.foreground, "250 250 250"),
    "--color-foreground-muted": hexToRgbTriplet(theme.foreground_muted, "161 161 170"),
    "--color-accent": hexToRgbTriplet(theme.accent, "220 38 38"),
    "--color-accent-hover": hexToRgbTriplet(theme.accent_hover, "185 28 28"),
    "--color-accent-light": hexToRgbTriplet(theme.accent_light, "239 68 68"),
    "--color-border": hexToRgbTriplet(theme.border, "39 39 42"),
    "--color-border-hover": hexToRgbTriplet(theme.border_hover, "63 63 70"),
  };
}
