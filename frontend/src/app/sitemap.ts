import { MetadataRoute } from "next";

// Force server-render on every request — no build-time backend needed
export const dynamic = "force-dynamic";

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

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL,                           lastModified: now, changeFrequency: "hourly",  priority: 1.0 },
    { url: `${SITE_URL}/search`,               lastModified: now, changeFrequency: "daily",   priority: 0.8 },
    { url: `${SITE_URL}/terms`,                lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/privacy`,              lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/contact`,              lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/dmca`,                 lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/2257`,                 lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/acceptable-content`,   lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/content-removal`,      lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];

  // Category pages
  const categoryPages: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${SITE_URL}/category/${c}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.9,
  }));

  // Video pages — fetch in parallel batches, cap at 20 pages × 500 = 10,000 videos
  const videoPages: MetadataRoute.Sitemap = [];
  const PER_PAGE = 500;
  const MAX_PAGES = 20;

  try {
    const statsRes = await fetch(`${SERVER_API}/api/stats`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });

    if (statsRes.ok) {
      const stats = await statsRes.json();
      const total: number = stats.total_videos ?? 0;
      const totalPages = Math.min(Math.ceil(total / PER_PAGE), MAX_PAGES);

      // Fetch 5 pages at a time to stay well under any timeout
      for (let batchStart = 1; batchStart <= totalPages; batchStart += 5) {
        const batchEnd = Math.min(batchStart + 4, totalPages);
        const pageNums = Array.from(
          { length: batchEnd - batchStart + 1 },
          (_, i) => batchStart + i
        );

        const results = await Promise.allSettled(
          pageNums.map((p) =>
            fetch(`${SERVER_API}/api/videos?page=${p}&per_page=${PER_PAGE}&sort=latest`, {
              cache: "no-store",
              signal: AbortSignal.timeout(10000),
            }).then((r) => r.json())
          )
        );

        for (const r of results) {
          if (r.status === "fulfilled" && Array.isArray(r.value?.videos)) {
            for (const v of r.value.videos) {
              videoPages.push({
                url: `${SITE_URL}/video/${v.id}`,
                lastModified: new Date(v.last_updated_at || v.added_at || now),
                changeFrequency: "weekly" as const,
                priority: 0.7,
              });
            }
          }
        }
      }
    }
  } catch {
    // If backend is unreachable, return static + category pages only
  }

  return [...staticPages, ...categoryPages, ...videoPages];
}
