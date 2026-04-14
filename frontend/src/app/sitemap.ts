import { MetadataRoute } from "next";

const SITE_URL = process.env.SITE_URL || "https://yourdomain.com";

// Static categories for sitemap
const categories = [
  "femdom",
  "bondage",
  "shibari",
  "bdsm",
  "slave",
  "submission",
  "chastity",
  "latex",
  "leather",
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

  // Base pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/search`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/dmca`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/2257`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  // Category pages
  const categoryPages: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${SITE_URL}/category/${category}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.9,
  }));

  // Note: For a complete sitemap with video pages, you would fetch video IDs
  // from your API and generate URLs. For large sites, consider generating
  // sitemap index with multiple sitemap files.

  return [...staticPages, ...categoryPages];
}
