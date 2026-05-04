import { MetadataRoute } from "next";
import * as fs from "fs";
import * as path from "path";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  "https://kinktube.fun"
).replace(/\/+$/, "");

/**
 * Reads the generated sitemap.xml index at runtime and extracts all child
 * sitemap URLs. Falls back to a hardcoded baseline if the file isn't present
 * (e.g. during local dev before the build script has run).
 */
function getSitemapUrls(): string[] {
  const baseline = [
    `${SITE_URL}/sitemap.xml`,
    `${SITE_URL}/sitemap-static.xml`,
    `${SITE_URL}/sitemap-categories.xml`,
  ];

  try {
    const indexPath = path.join(process.cwd(), "public", "sitemap.xml");
    if (!fs.existsSync(indexPath)) return baseline;

    const xml = fs.readFileSync(indexPath, "utf-8");
    // Extract every <loc> inside <sitemap> tags
    const matches = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)];
    if (!matches.length) return baseline;

    // Always include the index itself first, then child sitemaps
    const children = matches
      .map((m) => m[1].trim())
      .filter((loc) => loc.startsWith("http"));

    return [`${SITE_URL}/sitemap.xml`, ...children];
  } catch {
    return baseline;
  }
}

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/portal/", "/search"],
      },
      // Each AI bot needs its own rule block — grouping them in a single
      // userAgent array generates stacked User-Agent lines without paired
      // Disallow directives, which many parsers misinterpret.
      { userAgent: "GPTBot", disallow: "/" },
      { userAgent: "ChatGPT-User", disallow: "/" },
      { userAgent: "CCBot", disallow: "/" },
      { userAgent: "anthropic-ai", disallow: "/" },
    ],
    // Only list the sitemap index — Google follows <loc> child entries
    // automatically, so listing all 13 sub-sitemaps here is redundant.
    sitemap: getSitemapUrls(),
  };
}
