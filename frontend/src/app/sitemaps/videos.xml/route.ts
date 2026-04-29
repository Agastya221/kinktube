import { NextResponse } from 'next/server';
import { getVideosServer, getStatsServer } from '@/lib/api';

export const revalidate = 3600;

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  "https://kinktube.fun"
).replace(/\/+$/, "");

const VIDEOS_PER_PAGE = 1000; // Fetch in manageable batches

export async function GET() {
  try {
    // Get total video count first
    const stats = await getStatsServer();
    const totalVideos = stats.total_videos || 0;
    const totalPages = Math.ceil(totalVideos / VIDEOS_PER_PAGE);

    // Fetch all pages concurrently (cap at 20 pages = 20,000 videos max per request)
    const pagesToFetch = Math.min(totalPages, 20);
    const pagePromises = Array.from({ length: pagesToFetch }, (_, i) =>
      getVideosServer({ page: i + 1, per_page: VIDEOS_PER_PAGE, sort: 'latest' })
        .catch(() => ({ videos: [] }))
    );

    const results = await Promise.all(pagePromises);
    const allVideos = results.flatMap(r => r.videos || []);

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allVideos.map(video => {
  const videoId = video.external_id || video.id;
  const lastmod = video.last_updated_at || video.added_at;
  return `  <url>
    <loc>${SITE_URL}/video/${videoId}</loc>
    <lastmod>${new Date(lastmod).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
}).join('\n')}
</urlset>`;

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    console.error('Error generating videos sitemap:', error);

    // Return empty sitemap on error rather than 500
    const emptyXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`;

    return new NextResponse(emptyXml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
      },
    });
  }
}
