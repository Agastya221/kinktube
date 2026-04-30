import { NextResponse } from 'next/server';
import { getVideosServer } from '@/lib/api';
import { slugify } from '@/lib/types';

/**
 * Paginated video sitemap: /sitemaps/videos/[page].xml
 *
 * Each sub-sitemap contains up to 10,000 URLs (well under Google's 50k limit).
 * This prevents OOM errors and timeouts when the site scales to 100k+ videos.
 *
 * The sitemap index at /sitemap.xml dynamically lists all sub-sitemaps.
 */

export const revalidate = 3600; // Regenerate every hour

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  "https://kinktube.fun"
).replace(/\/+$/, "");

// 10,000 URLs per sitemap file — safe for memory and well under Google's 50k limit
const URLS_PER_SITEMAP = 10000;

// Backend API page size for fetching videos
const API_PAGE_SIZE = 1000;

interface RouteParams {
  params: Promise<{ page: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { page: pageParam } = await params;

  // Strip .xml extension to get page number: "1.xml" → 1
  const sitemapPage = parseInt(pageParam.replace(/\.xml$/i, ""), 10);

  if (isNaN(sitemapPage) || sitemapPage < 1) {
    return new NextResponse("Not Found", { status: 404 });
  }

  try {
    // Calculate which API pages to fetch for this sitemap page
    // Sitemap page 1 → API pages 1-10 (videos 1-10000)
    // Sitemap page 2 → API pages 11-20 (videos 10001-20000)
    const apiPagesPerSitemap = Math.ceil(URLS_PER_SITEMAP / API_PAGE_SIZE);
    const startApiPage = (sitemapPage - 1) * apiPagesPerSitemap + 1;
    const endApiPage = startApiPage + apiPagesPerSitemap - 1;

    // Fetch all API pages for this sitemap chunk concurrently
    const pagePromises = Array.from(
      { length: endApiPage - startApiPage + 1 },
      (_, i) =>
        getVideosServer({
          page: startApiPage + i,
          per_page: API_PAGE_SIZE,
          sort: "latest",
        }).catch(() => ({ videos: [] as Array<{ external_id: string; id: number; title: string; last_updated_at: string; added_at: string }> }))
    );

    const results = await Promise.all(pagePromises);
    const videos = results.flatMap((r) => r.videos || []);

    // If no videos found for this page, return 404
    if (videos.length === 0) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${videos
  .map((video) => {
    const videoId = video.external_id || video.id;
    const slug = video.title ? slugify(video.title) : "video";
    const lastmod = video.last_updated_at || video.added_at;
    return `  <url>
    <loc>${SITE_URL}/video/${videoId}/${slug}</loc>
    <lastmod>${new Date(lastmod).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
  })
  .join("\n")}
</urlset>`;

    return new NextResponse(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (error) {
    console.error(`Error generating videos sitemap page ${sitemapPage}:`, error);

    const emptyXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`;

    return new NextResponse(emptyXml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
      },
    });
  }
}
