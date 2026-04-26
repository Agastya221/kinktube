import { MetadataRoute } from "next";
import { getPublicSiteSettingsServer } from "@/lib/api";
import { fallbackPublicSiteSettings } from "@/lib/site-settings";

// Static categories for sitemap — mirrors backend GetDefaultCategories()
const categories = [
  // Core dynamics
  "bdsm",
  "femdom",
  "bondage",
  "dominatrix",
  "submission",
  "slave",
  // Impact play
  "spanking",
  "caning",
  "whipping",
  // Bondage sub-genres
  "shibari",
  "device-bondage",
  "medical-bondage",
  "vacbed",
  "extreme-bondage",
  "predicament",
  "mummification",
  // Fetish attire
  "latex",
  "leather",
  // Specialty acts
  "strapon",
  "facesitting",
  "foot-fetish",
  "cbt",
  "chastity",
  "public-humiliation",
  // Psychological
  "sensory-deprivation",
  "severe-discipline",
  "pet-play",
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
      url: `${siteURL}/contact`,
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
    {
      url: `${siteURL}/acceptable-content`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${siteURL}/content-removal`,
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
