import { NextResponse } from 'next/server';

export const revalidate = 3600;

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  "https://kinktube.fun"
).replace(/\/+$/, "");

const staticPages = [
  { url: SITE_URL, priority: 1.0, changefreq: 'daily' },
  { url: `${SITE_URL}/contact`, priority: 0.5, changefreq: 'monthly' },
  { url: `${SITE_URL}/terms`, priority: 0.3, changefreq: 'monthly' },
  { url: `${SITE_URL}/privacy`, priority: 0.3, changefreq: 'monthly' },
  { url: `${SITE_URL}/dmca`, priority: 0.3, changefreq: 'monthly' },
  { url: `${SITE_URL}/2257`, priority: 0.3, changefreq: 'monthly' },
  { url: `${SITE_URL}/acceptable-content`, priority: 0.3, changefreq: 'monthly' },
  { url: `${SITE_URL}/content-removal`, priority: 0.3, changefreq: 'monthly' },
];

export async function GET() {
  const now = new Date().toISOString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages.map(page => `  <url>
    <loc>${page.url}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority.toFixed(1)}</priority>
  </url>`).join('\n')}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
