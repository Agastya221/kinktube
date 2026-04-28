import { MetadataRoute } from "next";

// Force dynamic rendering - never pre-render at build time
export const dynamic = "force-dynamic";
export const revalidate = 3600; // Re-generate every hour

const SITE_URL =
  process.env.SITE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://kinktube.fun";

const SERVER_API =
  process.env.API_URL ||
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8080";

const categories = [
  "bdsm", "femdom", "bondage", "dominatrix", "submission", "slave",
  "spanking", "caning", "whipping", "shibari", "device-bondage",
  "medical-bondage", "vacbed", "extreme-bondage", "predicament",
  "mummification", "latex", "leather", "strapon", "facesitting",
  "foot-fetish", "cbt", "chastity", "public-humiliation",
  "sensory-deprivation", "severe-discipline", "pet-play",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const siteURL = SITE_URL;

  // Static pages
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

  // Category pages
  const categoryPages: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${siteURL}/category/${category}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.9,
  }));

  // Video pages - fetch up to 50,000 videos across pages
  const videoPages: MetadataRoute.Sitemap = [];
  try {
    // First get total count
    const statsRes = await fetch(`${SERVER_API}/api/stats`, { cache: "no-store" });
    if (statsRes.ok) {
      const stats = await statsRes.json();
      const total: number = stats.total_videos || 0;
      const perPage = 500;
      const totalPages = Math.min(Math.ceil(total / perPage), 40); // cap at 20,000 videos

      // Fetch all pages in parallel (batches of 5 to avoid overwhelming backend)
      for (let batch = 0; batch < totalPages; batch += 5) {
        const batchPages = Array.from(
          { length: Math.min(5, totalPages - batch) },
          (_, i) => batch + i + 1
        );

        const results = await Promise.allSettled(
          batchPages.map((page) =>
            fetch(`${SERVER_API}/api/videos?page=${page}&per_page=${perPage}&sort=latest`, {
              cache: "no-store",
            }).then((r) => r.json())
          )
        );

        for (const result of results) {
          if (result.status === "fulfilled" && result.value?.videos) {
            for (const video of result.value.videos) {
              videoPages.push({
                url: `${siteURL}/video/${video.id}`,
                lastModified: new Date(video.last_updated_at || video.added_at || now),
                changeFrequency: "weekly" as const,
                priority: 0.7,
              });
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("Sitemap: failed to fetch videos", err);
  }

  return [...staticPages, ...categoryPages, ...videoPages];
}
