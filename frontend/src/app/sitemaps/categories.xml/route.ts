import { NextResponse } from 'next/server';
import { getCategoriesServer } from '@/lib/api';
import { defaultCategories } from '@/lib/default-categories';

export const revalidate = 3600;

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  "https://kinktube.fun"
).replace(/\/+$/, "");

export async function GET() {
  let categories = defaultCategories;

  try {
    const data = await getCategoriesServer();
    if (data.categories?.length) {
      categories = data.categories;
    }
  } catch {
    // Fallback to defaults
  }

  const now = new Date().toISOString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${categories.map(cat => `  <url>
    <loc>${SITE_URL}/category/${cat.slug}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`).join('\n')}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
