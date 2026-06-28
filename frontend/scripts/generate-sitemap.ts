#!/usr/bin/env tsx
/**
 * =============================================================================
 * KinkTube — Static Sitemap Generator
 * =============================================================================
 *
 * Generates pre-built XML sitemap files into /public/ so they are served as
 * static assets by Next.js (and cached instantly by Cloudflare).
 *
 * Output:
 *   public/sitemap.xml            — Sitemap index
 *   public/sitemap-static.xml     — Homepage + legal pages
 *   public/sitemap-categories.xml — All category pages
 *   public/sitemap-videos-1.xml   — Videos 1–10,000
 *   public/sitemap-videos-2.xml   — Videos 10,001–20,000
 *   ...
 *
 * Usage:
 *   npx tsx scripts/generate-sitemap.ts
 *   npm run generate:sitemap
 *
 * Environment:
 *   SITEMAP_API_URL / API_URL / NEXT_PUBLIC_API_URL
 *                                   — Backend base URL (default: http://localhost:8080)
 *   SITE_URL / NEXT_PUBLIC_SITE_URL — Canonical site URL (default: https://kinktube.fun)
 */

import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const isRailway = process.env.RAILWAY_ENVIRONMENT_NAME || process.env.RAILWAY_PROJECT_ID;
const RAILWAY_PUBLIC_API_URL =
  process.env.SITEMAP_API_URL?.trim().replace(/\/+$/, "") || null;

function normalizeApiUrl(rawUrl?: string | null): string | null {
  const url = rawUrl?.trim();
  if (!url) return null;

  if (url.includes(".railway.internal")) {
    return RAILWAY_PUBLIC_API_URL;
  }

  if (isRailway && /localhost|127\.0\.0\.1/.test(url)) {
    return null;
  }

  return url.replace(/\/+$/, "");
}

function getApiBaseUrl(): string {
  const candidates = [
    process.env.SITEMAP_API_URL,
    process.env.API_URL,
    process.env.INTERNAL_API_URL,
    process.env.NEXT_PUBLIC_API_URL,
    isRailway ? RAILWAY_PUBLIC_API_URL : undefined,
    "http://localhost:8080",
  ];

  for (const candidate of candidates) {
    const normalized = normalizeApiUrl(candidate);
    if (normalized) return normalized;
  }

  return "http://localhost:8080";
}

const API_BASE_URL = getApiBaseUrl();

const SITE_URL = (
  process.env.SITE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://kinktube.fun"
).replace(/\/+$/, "");

const PUBLIC_DIR = path.resolve(__dirname, "..", "public");

/** Max URLs per individual sitemap file (Google limit: 50,000; we use 10k for safety). */
const URLS_PER_SITEMAP = 10_000;

/** Timeout per fetch request (ms). */
const FETCH_TIMEOUT_MS = 30_000;

/** Minimum delay between sitemap API requests. Keeps deploy builds under backend rate limits. */
const REQUEST_DELAY_MS = readPositiveIntEnv("SITEMAP_REQUEST_DELAY_MS", 750);

/** Retry transient API failures, especially Railway/backend 429 rate limits. */
const FETCH_MAX_RETRIES = readPositiveIntEnv("SITEMAP_FETCH_RETRIES", 4);

let nextFetchAt = 0;

class NonRetryableAPIError extends Error {}

// ---------------------------------------------------------------------------
// Types (minimal — no import from src/ to keep the script standalone)
// ---------------------------------------------------------------------------

interface Video {
  id: number;
  external_id: string;
  title: string;
  description?: string;
  thumbnail: string;
  thumbnail_lg: string;
  duration: number;
  embed_url: string;
  last_updated_at: string;
  added_at: string;
}

interface SitemapVideoResponse {
  videos: Video[];
  next_cursor: number;
  has_more: boolean;
}

interface Category {
  slug: string;
  name: string;
  video_count: number;
}

interface CategoriesResponse {
  categories: Category[];
}

// ---------------------------------------------------------------------------
// Hardcoded fallbacks (mirrors src/lib/default-categories.ts)
// ---------------------------------------------------------------------------

const DEFAULT_CATEGORIES: Category[] = [
  { slug: "femdom", name: "Femdom", video_count: 0 },
  { slug: "bondage", name: "Bondage", video_count: 0 },
  { slug: "shibari", name: "Shibari", video_count: 0 },
  { slug: "slave", name: "Slave", video_count: 0 },
  { slug: "submission", name: "Submission", video_count: 0 },
  { slug: "chastity", name: "Chastity", video_count: 0 },
  { slug: "device-bondage", name: "Device Bondage", video_count: 0 },
  { slug: "medical-bondage", name: "Medical Bondage", video_count: 0 },
  { slug: "vacbed", name: "Vacbed", video_count: 0 },
  { slug: "spanking", name: "Spanking", video_count: 0 },
  { slug: "caning", name: "Caning", video_count: 0 },
  { slug: "latex", name: "Latex", video_count: 0 },
  { slug: "dominatrix", name: "Dominatrix", video_count: 0 },
  { slug: "public-humiliation", name: "Public Humiliation", video_count: 0 },
  { slug: "whipping", name: "Whipping", video_count: 0 },
  { slug: "cbt", name: "CBT", video_count: 0 },
  { slug: "foot-fetish", name: "Foot Fetish", video_count: 0 },
  { slug: "facesitting", name: "Facesitting", video_count: 0 },
  { slug: "strapon", name: "Strapon", video_count: 0 },
  { slug: "extreme-bondage", name: "Extreme Bondage", video_count: 0 },
  { slug: "predicament", name: "Predicament", video_count: 0 },
  { slug: "mummification", name: "Mummification", video_count: 0 },
  { slug: "sensory-deprivation", name: "Sensory Deprivation", video_count: 0 },
  { slug: "severe-discipline", name: "Severe Discipline", video_count: 0 },
  { slug: "pet-play", name: "Pet Play", video_count: 0 },
];

const STATIC_PAGES = [
  { path: "/", priority: 1.0, changefreq: "daily" },
  { path: "/bdsm-test", priority: 0.9, changefreq: "weekly" },
  { path: "/bdsm-meaning", priority: 0.9, changefreq: "weekly" },
  { path: "/contact", priority: 0.5, changefreq: "monthly" },
  { path: "/terms", priority: 0.3, changefreq: "monthly" },
  { path: "/privacy", priority: 0.3, changefreq: "monthly" },
  { path: "/dmca", priority: 0.3, changefreq: "monthly" },
  { path: "/2257", priority: 0.3, changefreq: "monthly" },
  { path: "/acceptable-content", priority: 0.3, changefreq: "monthly" },
  { path: "/content-removal", priority: 0.3, changefreq: "monthly" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readPositiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForFetchSlot(): Promise<void> {
  if (REQUEST_DELAY_MS <= 0) return;

  const now = Date.now();
  const waitMs = Math.max(0, nextFetchAt - now);
  nextFetchAt = Math.max(now, nextFetchAt) + REQUEST_DELAY_MS;

  if (waitMs > 0) {
    await sleep(waitMs);
  }
}

function retryAfterMs(headerValue: string | null): number | null {
  if (!headerValue) return null;

  const seconds = Number.parseInt(headerValue, 10);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000;
  }

  const dateMs = Date.parse(headerValue);
  if (Number.isFinite(dateMs)) {
    return Math.max(0, dateMs - Date.now());
  }

  return null;
}

function transientRetryDelayMs(status: number, attempt: number, retryAfterHeader?: string | null): number | null {
  if (status !== 429 && status < 500) return null;

  const retryAfter = retryAfterMs(retryAfterHeader || null);
  if (retryAfter !== null) {
    return Math.min(retryAfter, 90_000);
  }

  if (status === 429) {
    return Math.min(65_000, 15_000 * attempt);
  }

  return Math.min(10_000, 1000 * 2 ** (attempt - 1));
}

function slugify(text: string, maxLength = 80): string {
  return text
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, maxLength)
    .replace(/-$/, "");
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function fetchJson<T>(endpoint: string): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  for (let attempt = 1; attempt <= FETCH_MAX_RETRIES + 1; attempt++) {
    await waitForFetchSlot();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        return (await res.json()) as T;
      }

      const retryDelay = transientRetryDelayMs(res.status, attempt, res.headers.get("retry-after"));
      if (retryDelay !== null && attempt <= FETCH_MAX_RETRIES) {
        console.warn(
          `  ⚠ API ${res.status} for ${endpoint}; retrying in ${(retryDelay / 1000).toFixed(1)}s ` +
            `(${attempt}/${FETCH_MAX_RETRIES})`
        );
        await sleep(retryDelay);
        continue;
      }

      throw new NonRetryableAPIError(`API ${res.status}: ${url}`);
    } catch (err) {
      if (err instanceof NonRetryableAPIError) {
        throw err;
      }

      if (attempt <= FETCH_MAX_RETRIES) {
        const retryDelay = Math.min(10_000, 1000 * 2 ** (attempt - 1));
        console.warn(
          `  ⚠ Request failed for ${endpoint}: ${(err as Error).message}; retrying in ` +
            `${(retryDelay / 1000).toFixed(1)}s (${attempt}/${FETCH_MAX_RETRIES})`
        );
        await sleep(retryDelay);
        continue;
      }

      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error(`API request failed after retries: ${url}`);
}

function writeXml(filename: string, content: string): void {
  const filepath = path.join(PUBLIC_DIR, filename);
  const trimmedContent = content.trim();
  fs.writeFileSync(filepath, trimmedContent, "utf-8");
  const sizeKB = (Buffer.byteLength(trimmedContent, "utf-8") / 1024).toFixed(1);
  console.log(`  ✓ ${filename} (${sizeKB} KB)`);
}

function cleanGeneratedSitemaps(): void {
  if (!fs.existsSync(PUBLIC_DIR)) return;

  const generatedSitemapPattern =
    /^sitemap(?:-(?:static|categories|videos-\d+))?\.xml$/;

  for (const filename of fs.readdirSync(PUBLIC_DIR)) {
    if (generatedSitemapPattern.test(filename)) {
      fs.unlinkSync(path.join(PUBLIC_DIR, filename));
    }
  }
}

// ---------------------------------------------------------------------------
// Sitemap builders
// ---------------------------------------------------------------------------

function buildUrlsetXml(
  urls: Array<{ 
    loc: string; 
    lastmod?: string; 
    changefreq?: string; 
    priority?: number;
    video?: {
      thumbnail_loc: string;
      title: string;
      description: string;
      player_loc: string;
      duration: number;
      publication_date: string;
    }
  }>
): string {
  const isVideoSitemap = urls.some(u => u.video);
  const xmlns = isVideoSitemap
    ? 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"'
    : 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';

  const entries = urls
    .map((u) => {
      const parts = [`    <loc>${escapeXml(u.loc)}</loc>`];
      if (u.lastmod) parts.push(`    <lastmod>${u.lastmod}</lastmod>`);
      if (u.changefreq) parts.push(`    <changefreq>${u.changefreq}</changefreq>`);
      if (u.priority !== undefined) parts.push(`    <priority>${u.priority.toFixed(1)}</priority>`);

      if (u.video) {
        parts.push(`    <video:video>`);
        parts.push(`      <video:thumbnail_loc>${escapeXml(u.video.thumbnail_loc)}</video:thumbnail_loc>`);
        parts.push(`      <video:title>${escapeXml(u.video.title)}</video:title>`);
        parts.push(`      <video:description>${escapeXml(u.video.description || u.video.title)}</video:description>`);
        parts.push(`      <video:player_loc>${escapeXml(u.video.player_loc)}</video:player_loc>`);
        parts.push(`      <video:duration>${u.video.duration}</video:duration>`);
        parts.push(`      <video:publication_date>${u.video.publication_date}</video:publication_date>`);
        parts.push(`      <video:family_friendly>no</video:family_friendly>`);
        parts.push(`    </video:video>`);
      }

      return `  <url>\n${parts.join("\n")}\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset ${xmlns}>\n${entries}\n</urlset>\n`;
}

function buildSitemapIndexXml(
  sitemaps: Array<{ loc: string; lastmod: string }>
): string {
  const entries = sitemaps
    .map(
      (s) =>
        `  <sitemap>\n    <loc>${escapeXml(s.loc)}</loc>\n    <lastmod>${s.lastmod}</lastmod>\n  </sitemap>`
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</sitemapindex>\n`;
  console.log(`  ℹ Sitemap index generated with XML declaration: ${xml.startsWith("<?xml")}`);
  return xml;
}
// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function fetchCategories(): Promise<Category[]> {
  try {
    const data = await fetchJson<CategoriesResponse>("/api/categories");
    if (data.categories?.length) return data.categories;
  } catch (err) {
    throw new Error(`Could not fetch /api/categories: ${(err as Error).message}`);
  }
  return DEFAULT_CATEGORIES;
}

async function fetchAllVideos(): Promise<Video[]> {
  const videos: Video[] = [];
  let cursor = 0;
  let page = 1;

  console.log(`  Fetching videos from /api/sitemap/videos in ${URLS_PER_SITEMAP}-row batches...`);

  for (;;) {
    const data = await fetchJson<SitemapVideoResponse>(
      `/api/sitemap/videos?cursor=${cursor}&limit=${URLS_PER_SITEMAP}`
    );
    const batch = data.videos || [];
    videos.push(...batch);

    console.log(`  ✓ batch ${page}: ${batch.length} videos`);

    if (!data.has_more || batch.length === 0) {
      break;
    }

    cursor = data.next_cursor;
    page++;
  }

  return videos;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const startTime = Date.now();
  const now = new Date().toISOString();

  console.log("┌─────────────────────────────────────────────┐");
  console.log("│  KinkTube Static Sitemap Generator          │");
  console.log("└─────────────────────────────────────────────┘");
  console.log(`  API:  ${API_BASE_URL}`);
  console.log(`  Site: ${SITE_URL}`);
  console.log(`  Out:  ${PUBLIC_DIR}`);
  console.log();

  // Ensure public dir exists
  if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  }
  cleanGeneratedSitemaps();

  // ── 1. Static pages sitemap ────────────────────────────────────────────
  console.log("[1/4] Generating sitemap-static.xml...");
  const staticUrls = STATIC_PAGES.map((p) => ({
    loc: `${SITE_URL}${p.path}`,
    lastmod: now,
    changefreq: p.changefreq,
    priority: p.priority,
  }));
  writeXml("sitemap-static.xml", buildUrlsetXml(staticUrls));

  // ── 2. Categories sitemap ──────────────────────────────────────────────
  console.log("[2/4] Generating sitemap-categories.xml...");
  const categories = await fetchCategories();
  const catUrls = categories.map((cat) => ({
    loc: `${SITE_URL}/category/${cat.slug}`,
    lastmod: now,
    changefreq: "daily" as const,
    priority: 0.8,
  }));
  writeXml("sitemap-categories.xml", buildUrlsetXml(catUrls));

  // ── 3. Video sitemaps (paginated) ──────────────────────────────────────
  console.log("[3/4] Generating video sitemaps...");
  const videos = await fetchAllVideos();

  const videoSitemapFiles: string[] = [];

  if (videos.length === 0) {
    console.log("  ⚠ No videos found — skipping video sitemaps.");
  } else {
    const totalChunks = Math.ceil(videos.length / URLS_PER_SITEMAP);
    console.log(`  ${videos.length} videos → ${totalChunks} sitemap file(s)`);

    for (let chunk = 0; chunk < totalChunks; chunk++) {
      const start = chunk * URLS_PER_SITEMAP;
      const end = Math.min(start + URLS_PER_SITEMAP, videos.length);
      const slice = videos.slice(start, end);

      const videoUrls = slice.map((v) => {
        const id = v.external_id || v.id;
        const slug = v.title ? slugify(v.title) : "video";
        const lastmod = v.last_updated_at || v.added_at;
        const pubDate = v.added_at || v.last_updated_at;

        return {
          loc: `${SITE_URL}/video/${id}/${slug}`,
          lastmod: lastmod ? new Date(lastmod).toISOString() : now,
          changefreq: "weekly" as const,
          priority: 0.7,
          video: {
            thumbnail_loc: v.thumbnail_lg || v.thumbnail,
            title: v.title,
            description: v.description || `Watch ${v.title} on KinkTube. Free adult BDSM and kink videos updated daily.`,
            player_loc: v.embed_url,
            duration: v.duration,
            publication_date: pubDate ? new Date(pubDate).toISOString() : now,
          }
        };
      });

      const filename = `sitemap-videos-${chunk + 1}.xml`;
      writeXml(filename, buildUrlsetXml(videoUrls));
      videoSitemapFiles.push(filename);
    }
  }

  // ── 4. Sitemap index ───────────────────────────────────────────────────
  console.log("[4/4] Generating sitemap.xml (index)...");
  const indexEntries = [
    { loc: `${SITE_URL}/sitemap-static.xml`, lastmod: now },
    { loc: `${SITE_URL}/sitemap-categories.xml`, lastmod: now },
    ...videoSitemapFiles.map((f) => ({
      loc: `${SITE_URL}/${f}`,
      lastmod: now,
    })),
  ];
  writeXml("sitemap.xml", buildSitemapIndexXml(indexEntries));

  // ── Summary ────────────────────────────────────────────────────────────
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const totalUrls = staticUrls.length + catUrls.length + videos.length;
  console.log();
  console.log(`✅ Done in ${elapsed}s — ${totalUrls} URLs across ${2 + videoSitemapFiles.length} sitemaps`);
}

main().catch((err) => {
  console.error("❌ Sitemap generation failed:", err);
  process.exit(1);
});
