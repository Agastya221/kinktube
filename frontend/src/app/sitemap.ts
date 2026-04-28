import { MetadataRoute } from "next";

// Force dynamic — never pre-render at build time.
// Next.js will serve /sitemap.xml as a sitemap INDEX pointing to /sitemap/0.xml, /sitemap/1.xml …
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

const VIDEOS_PER_CHUNK = 1000;

const categories = [
  "bdsm", "femdom", "bondage", "dominatrix", "submission", "slave",
  "spanking", "caning", "whipping", "shibari", "device-bondage",
  "medical-bondage", "vacbed", "extreme-bondage", "predicament",
  "mummification", "latex", "leather", "strapon", "facesitting",
  "foot-fetish", "cbt", "chastity", "public-humiliation",
  "sensory-deprivation", "severe-discipline", "pet-play",
];

// generateSitemaps is called by Next.js to know how many chunks exist.
// It returns [{id:0}, {id:1}, …] where id 0 = static+categories, id 1+ = videos.
export async function generateSitemaps() {
  try {
    const res = await fetch(`${SERVER_API}/api/stats`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`stats ${res.status}`);
    const stats = await res.json();
    const total: number = stats.total_videos || 0;
    const videoChunks = Math.max(1, Math.ceil(total / VIDEOS_PER_CHUNK));

    // id 0 = static + categories; ids 1..videoChunks = video pages
    const ids = [{ id: 0 }];
    for (let i = 1; i <= videoChunks; i++) ids.push({ id: i });
    return ids;
  } catch {
    // Fallback: at least serve the static chunk
    return [{ id: 0 }];
  }
}

// This function is called once per chunk id.
export default async function sitemap({
  id,
}: {
  id: number;
}): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // ── Chunk 0: static pages + categories ────────────────────────────────────
  if (id === 0) {
    const staticPages: MetadataRoute.Sitemap = [
      { url: SITE_URL,                             lastModified: now, changeFrequency: "hourly",  priority: 1.0 },
      { url: `${SITE_URL}/search`,                 lastModified: now, changeFrequency: "daily",   priority: 0.8 },
      { url: `${SITE_URL}/terms`,                  lastModified: now, changeFrequency: "monthly", priority: 0.3 },
      { url: `${SITE_URL}/privacy`,                lastModified: now, changeFrequency: "monthly", priority: 0.3 },
      { url: `${SITE_URL}/contact`,                lastModified: now, changeFrequency: "monthly", priority: 0.3 },
      { url: `${SITE_URL}/dmca`,                   lastModified: now, changeFrequency: "monthly", priority: 0.3 },
      { url: `${SITE_URL}/2257`,                   lastModified: now, changeFrequency: "monthly", priority: 0.3 },
      { url: `${SITE_URL}/acceptable-content`,     lastModified: now, changeFrequency: "monthly", priority: 0.3 },
      { url: `${SITE_URL}/content-removal`,        lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    ];
    const categoryPages: MetadataRoute.Sitemap = categories.map((c) => ({
      url: `${SITE_URL}/category/${c}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.9,
    }));
    return [...staticPages, ...categoryPages];
  }

  // ── Chunk 1+: video pages ─────────────────────────────────────────────────
  // id 1 → page 1 of the API (offset 0), id 2 → page 2, etc.
  try {
    const res = await fetch(
      `${SERVER_API}/api/videos?page=${id}&per_page=${VIDEOS_PER_CHUNK}&sort=latest`,
      { cache: "no-store", signal: AbortSignal.timeout(15000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const videos: Array<{ id: number; last_updated_at?: string; added_at?: string }> =
      data.videos ?? [];

    return videos.map((v) => ({
      url: `${SITE_URL}/video/${v.id}`,
      lastModified: new Date(v.last_updated_at || v.added_at || now),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  } catch {
    return [];
  }
}
