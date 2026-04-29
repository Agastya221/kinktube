import { MetadataRoute } from 'next';

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  "https://kinktube.fun"
).replace(/\/+$/, "");

// This generates /sitemap.xml as a sitemap index pointing to the sub-sitemaps.
// The actual content lives in dedicated route handlers:
//   /sitemaps/static/route.ts   -> /sitemaps/static.xml
//   /sitemaps/categories/route.ts -> /sitemaps/categories.xml
//   /sitemaps/videos/route.ts   -> /sitemaps/videos.xml
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}/sitemaps/static.xml`,
      lastModified: new Date(),
    },
    {
      url: `${SITE_URL}/sitemaps/categories.xml`,
      lastModified: new Date(),
    },
    {
      url: `${SITE_URL}/sitemaps/videos.xml`,
      lastModified: new Date(),
    },
  ];
}
