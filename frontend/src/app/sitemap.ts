import { MetadataRoute } from "next";
import { getPublicSiteSettingsServer } from "@/lib/api";
import { fallbackPublicSiteSettings } from "@/lib/site-settings";

// Static categories for sitemap
const categories = [
  "femdom",
  "bondage",
  "shibari",
  "slave",
  "submission",
  "chastity",
  "vacbed",
  "latex",
  "public-humiliation",
  "spanking",
  "caning",
  "strapon",
  "dominatrix",
  "device-bondage",
  "medical-bondage",
  "whipping",
  "foot-fetish",
  "facesitting",
  "cbt",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const settings = await getPublicSiteSettingsServer().catch(() => fallbackPublicSiteSettings);
  const siteURL = settings.seo.site_url || fallbackPublicSiteSettings.seo.site_url;

  // Base pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: siteURL,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 1.0,
    },
    {
      url: `${siteURL}/search`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${siteURL}/terms`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${siteURL}/privacy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${siteURL}/dmca`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${siteURL}/2257`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  // Category pages
  const categoryPages: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${siteURL}/category/${category}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.9,
  }));

  // Note: For a complete sitemap with video pages, you would fetch video IDs
  // from your API and generate URLs. For large sites, consider generating
  // sitemap index with multiple sitemap files.

  return [...staticPages, ...categoryPages];
}
