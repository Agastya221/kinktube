import { MetadataRoute } from "next";
import { getPublicSiteSettingsServer, getStatsServer, getVideosServer } from "@/lib/api";
import { fallbackPublicSiteSettings } from "@/lib/site-settings";

// Static categories for sitemap
const categories = [
  "bdsm", "femdom", "bondage", "dominatrix", "submission", "slave",
  "spanking", "caning", "whipping", "shibari", "device-bondage",
  "medical-bondage", "vacbed", "extreme-bondage", "predicament",
  "mummification", "latex", "leather", "strapon", "facesitting",
  "foot-fetish", "cbt", "chastity", "public-humiliation",
  "sensory-deprivation", "severe-discipline", "pet-play",
];

const VIDEOS_PER_SITEMAP = 1000;

export async function generateSitemaps() {
  try {
    const stats = await getStatsServer();
    const totalSitemaps = Math.ceil(stats.videos / VIDEOS_PER_SITEMAP);
    
    // Create an array of sitemap IDs: [{ id: 0 }, { id: 1 }, ... ]
    // id 0 will hold static pages & categories. id 1+ will hold videos.
    const sitemaps = [{ id: 0 }]; 
    for (let i = 0; i < totalSitemaps; i++) {
      sitemaps.push({ id: i + 1 });
    }
    return sitemaps;
  } catch (err) {
    console.error("Error generating sitemap IDs", err);
    return [{ id: 0 }];
  }
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const settings = await getPublicSiteSettingsServer().catch(() => fallbackPublicSiteSettings);
  const siteURL = settings.seo.site_url || fallbackPublicSiteSettings.seo.site_url;

  // Sitemap ID 0: Static pages and Categories
  if (id === 0) {
    const staticPages: MetadataRoute.Sitemap = [
      { url: siteURL, lastModified: now, changeFrequency: "hourly", priority: 1.0 },
      { url: `${siteURL}/search`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
      { url: `${siteURL}/terms`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
      { url: `${siteURL}/privacy`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
      { url: `${siteURL}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
      { url: `${siteURL}/dmca`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
      { url: `${siteURL}/2257`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
      { url: `${siteURL}/acceptable-content`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
      { url: `${siteURL}/content-removal`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    ];

    const categoryPages: MetadataRoute.Sitemap = categories.map((category) => ({
      url: `${siteURL}/category/${category}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    }));

    return [...staticPages, ...categoryPages];
  }

  // Sitemap ID > 0: Video pages
  // Note: id 1 corresponds to page 1
  try {
    const videoData = await getVideosServer({
      page: id,
      per_page: VIDEOS_PER_SITEMAP,
      sort: "newest"
    });

    return videoData.videos.map((video) => ({
      url: `${siteURL}/video/${video.id}`,
      lastModified: video.created_at ? new Date(video.created_at) : now,
      changeFrequency: "weekly",
      priority: 0.7,
    }));
  } catch (err) {
    console.error(`Error generating sitemap for id ${id}`, err);
    return [];
  }
}
