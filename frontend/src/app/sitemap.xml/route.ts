import { NextResponse } from 'next/server';
import { getStatsServer } from '@/lib/api';

/**
 * Dynamic Sitemap Index: /sitemap.xml
 *
 * Generates a sitemap index that references:
 *  - /sitemaps/static.xml       (legal pages, homepage)
 *  - /sitemaps/categories.xml   (all BDSM category pages)
 *  - /sitemaps/videos/1.xml     (videos 1-10,000)
 *  - /sitemaps/videos/2.xml     (videos 10,001-20,000)
 *  - ... dynamically computed based on total video count
 *
 * Google's limit is 50,000 URLs per sitemap and 500 sitemaps per index.
 * We use 10,000 per sitemap for safety, supporting up to 5M videos.
 */

export const revalidate = 3600; // Regenerate every hour

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  "https://kinktube.fun"
).replace(/\/+$/, "");

const URLS_PER_VIDEO_SITEMAP = 10000;

export async function GET() {
  const now = new Date().toISOString();

  // Calculate how many video sitemap pages we need
  let totalVideoSitemaps = 1;
  try {
    const stats = await getStatsServer();
    const totalVideos = stats.total_videos || 0;
    totalVideoSitemaps = Math.max(1, Math.ceil(totalVideos / URLS_PER_VIDEO_SITEMAP));
  } catch {
    // Fallback: at least 1 video sitemap
    totalVideoSitemaps = 1;
  }

  // Build the sitemap entries
  const sitemapEntries: string[] = [];

  // Static pages sitemap
  sitemapEntries.push(`  <sitemap>
    <loc>${SITE_URL}/sitemaps/static.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>`);

  // Categories sitemap
  sitemapEntries.push(`  <sitemap>
    <loc>${SITE_URL}/sitemaps/categories.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>`);

  // Paginated video sitemaps
  for (let i = 1; i <= totalVideoSitemaps; i++) {
    sitemapEntries.push(`  <sitemap>
    <loc>${SITE_URL}/sitemaps/videos/${i}.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries.join("\n")}
</sitemapindex>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=7200, stale-while-revalidate=86400',
    },
  });
}
