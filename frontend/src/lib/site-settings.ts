import type { CSSProperties } from "react";

import type { PublicSiteSettings } from "./types";

const fallbackTermsContent = `Last updated: April 26, 2026

KinkTube is an adult video discovery and embed site. You must be at least 18 years old and the age of majority in your jurisdiction to access this site.

We use the Eporner API and related third-party metadata to list, organize, search, and embed videos from third-party platforms. We do not upload, produce, sell, or host the underlying video files.

Third-party sites are responsible for their own content, privacy practices, terms, performer records, and removal processes. We may remove links or embeds from KinkTube, but removal from this site does not remove source content from Eporner or the original host.

You agree not to scrape, clone, overload, interfere with, bypass security controls, submit abusive reports, infringe rights, or use the site for unlawful or non-consensual activity.

We have zero tolerance for child sexual abuse material, child exploitation, non-consensual intimate content, trafficking, coercion, malware, scams, stolen content, or content that appears to violate applicable law.

KinkTube is provided as-is and as-available. We may update these terms at any time.`;

const fallbackPrivacyContent = `Last updated: April 26, 2026

KinkTube is an adult video discovery and embed site using third-party video data and embeds, including from the Eporner API.

We may process limited technical, usage, cookie, age-gate, analytics, advertising, security, and report information needed to operate the site, protect it from abuse, improve performance, and respond to legal or content-removal requests.

Third parties such as Eporner, analytics providers, advertising networks, embedded players, CDN providers, and security providers may receive technical information when their resources load in your browser. Their privacy policies govern their own processing.

This site is for adults only. We do not knowingly collect personal information from minors.

You can block or delete cookies in your browser, though some features may work less smoothly. Privacy questions can be submitted through the Contact page.`;

const fallbackDMCAContent = `Last updated: April 26, 2026

KinkTube respects copyright owners and responds to valid DMCA notices.

KinkTube does not host the underlying video files. We use third-party embeds and metadata, including content made available through the Eporner API. A valid notice can result in removal or disabling of the relevant listing, thumbnail, embed, or link from KinkTube, but it will not remove the original video from Eporner or another host.

Please include your signature, the copyrighted work, the exact KinkTube URL, the source URL if available, your contact details, a good-faith statement, an accuracy statement under penalty of perjury, and confirmation that you are the owner or authorized agent.

Counter-notices may be submitted when material was removed because of mistake or misidentification. Misrepresenting infringement may create legal liability.`;

const fallback2257Content = `Last updated: April 26, 2026

KinkTube is an adult video discovery and embed site. We do not produce, upload, host, or sell the visual depictions displayed through embedded third-party players.

The videos indexed or embedded on KinkTube are supplied by third-party platforms and metadata sources, including the Eporner API. KinkTube is not the primary or secondary producer of those visual depictions as those terms are used in 18 U.S.C. 2257, 18 U.S.C. 2257A, or 28 C.F.R. Part 75.

Any required records should be maintained by the original producer, publisher, or hosting platform responsible for the content.`;

const fallbackAcceptableContent = `Last updated: April 26, 2026

KinkTube indexes and embeds lawful adult content from third-party sources. We will not knowingly list, promote, embed, or link to content involving minors, child sexual abuse material, child exploitation, non-consensual intimate content, revenge porn, coerced content, trafficking, deepfakes without consent, real violence, bestiality, malware, scams, stolen copyrighted material, harassment, threats, or other illegal activity.

Consensual BDSM fantasy, roleplay, restraint, dominance, submission, and fetish themes may appear on the site. That does not permit content involving minors, real coercion, lack of consent, real injury, trafficking, or illegal activity.

When we identify a violation, we can remove or disable the listing, embed, thumbnail, title, tag, or link from KinkTube. Source-file removal must be handled by Eporner or the original host.`;

const fallbackContentRemoval = `Last updated: April 26, 2026

KinkTube does not host video files. We can remove or disable KinkTube pages, indexed metadata, embedded players, thumbnails, titles, tags, categories, and outbound links. We cannot remove the original video from Eporner or any other third-party host.

You may request review for content involving minors, non-consensual publication, coercion, trafficking, exploitation, unauthorized use of your image or likeness, copyright infringement, malware, scams, or violations of our Acceptable Content Policy.

Reports should include the exact KinkTube URL, the Eporner or third-party source URL if available, the reason for removal, your relationship to the content, and a reliable way to contact you if follow-up is needed.`;

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
    terms: { title: "Terms of Service", content: fallbackTermsContent },
    privacy: { title: "Privacy Policy", content: fallbackPrivacyContent },
    dmca: { title: "DMCA Notice & Takedown Policy", content: fallbackDMCAContent },
    compliance_2257: { title: "18 U.S.C. 2257 Compliance Statement", content: fallback2257Content },
    acceptable_content: { title: "Acceptable Content Policy", content: fallbackAcceptableContent },
    content_removal: { title: "Content Removal Policy", content: fallbackContentRemoval },
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
