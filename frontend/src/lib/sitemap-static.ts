export const MAX_URLS_PER_SITEMAP = 10000;

export const SITE_URL = normalizeSiteUrl(
  process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "https://kinktube.fun"
);

export const sitemapCategories = [
  "bdsm",
  "femdom",
  "bondage",
  "dominatrix",
  "submission",
  "slave",
  "spanking",
  "caning",
  "whipping",
  "shibari",
  "device-bondage",
  "medical-bondage",
  "vacbed",
  "extreme-bondage",
  "predicament",
  "mummification",
  "latex",
  "leather",
  "strapon",
  "facesitting",
  "foot-fetish",
  "cbt",
  "chastity",
  "public-humiliation",
  "sensory-deprivation",
  "severe-discipline",
  "pet-play",
] as const;

export interface SitemapUrl {
  loc: string;
  lastmod?: Date | string;
  changefreq?: "hourly" | "daily" | "weekly" | "monthly";
  priority?: number;
}

export function normalizeSiteUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function formatSitemapDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }
  return date.toISOString();
}

export function buildUrlSetXml(urls: SitemapUrl[]): string {
  const body = urls
    .map((entry) => {
      const parts = [
        "  <url>",
        `    <loc>${escapeXml(entry.loc)}</loc>`,
      ];

      if (entry.lastmod) {
        parts.push(`    <lastmod>${formatSitemapDate(entry.lastmod)}</lastmod>`);
      }
      if (entry.changefreq) {
        parts.push(`    <changefreq>${entry.changefreq}</changefreq>`);
      }
      if (typeof entry.priority === "number") {
        parts.push(`    <priority>${entry.priority.toFixed(1)}</priority>`);
      }

      parts.push("  </url>");
      return parts.join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    body,
    "</urlset>",
    "",
  ].join("\n");
}

export function buildSitemapIndexXml(videoSitemapCount: number, lastmod: Date | string): string {
  const entries = [
    `${SITE_URL}/sitemap-static.xml`,
    ...Array.from(
      { length: videoSitemapCount },
      (_, index) => `${SITE_URL}/sitemap-videos-${index + 1}.xml`
    ),
  ];

  const body = entries
    .map(
      (loc) =>
        [
          "  <sitemap>",
          `    <loc>${escapeXml(loc)}</loc>`,
          `    <lastmod>${formatSitemapDate(lastmod)}</lastmod>`,
          "  </sitemap>",
        ].join("\n")
    )
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    body,
    "</sitemapindex>",
    "",
  ].join("\n");
}

export function buildStaticSitemapXml(now: Date = new Date()): string {
  const legalPages = [
    "/terms",
    "/privacy",
    "/contact",
    "/dmca",
    "/2257",
    "/acceptable-content",
    "/content-removal",
  ];

  const urls: SitemapUrl[] = [
    { loc: SITE_URL, lastmod: now, changefreq: "hourly", priority: 1.0 },
    { loc: `${SITE_URL}/search`, lastmod: now, changefreq: "daily", priority: 0.8 },
    ...legalPages.map((path) => ({
      loc: `${SITE_URL}${path}`,
      lastmod: now,
      changefreq: "monthly" as const,
      priority: 0.3,
    })),
    ...sitemapCategories.map((category) => ({
      loc: `${SITE_URL}/category/${category}`,
      lastmod: now,
      changefreq: "daily" as const,
      priority: 0.9,
    })),
  ];

  return buildUrlSetXml(urls);
}
