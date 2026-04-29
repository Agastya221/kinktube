import { MetadataRoute } from 'next';
import { getStatsServer, getVideosServer, getCategoriesServer } from '@/lib/api';
import { defaultCategories } from '@/lib/default-categories';

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  "https://kinktube.fun"
).replace(/\/+$/, "");

export async function generateSitemaps() {
  // Fetch total videos to calculate how many video sitemaps we need
  let totalVideos = 0;
  try {
    const stats = await getStatsServer();
    totalVideos = stats.total_videos;
  } catch (e) {
    console.error('Error fetching stats for sitemap:', e);
    totalVideos = 0;
  }

  // Define our sitemap IDs
  // 0 = static pages
  // 1 = categories
  // 2+ = videos
  const sitemaps = [
    { id: 0 }, 
    { id: 1 }, 
  ];

  const videosPerSitemap = 20000;
  // Always have at least one video sitemap, even if empty
  const numVideoSitemaps = Math.max(1, Math.ceil(totalVideos / videosPerSitemap));

  for (let i = 0; i < numVideoSitemaps; i++) {
    sitemaps.push({ id: 2 + i });
  }

  return sitemaps;
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  // 0: Static Pages Sitemap
  if (id === 0) {
    return [
      { url: SITE_URL, priority: 1.0, changeFrequency: 'daily' },
      { url: `${SITE_URL}/contact`, priority: 0.5, changeFrequency: 'monthly' },
      { url: `${SITE_URL}/terms`, priority: 0.3, changeFrequency: 'monthly' },
      { url: `${SITE_URL}/privacy`, priority: 0.3, changeFrequency: 'monthly' },
      { url: `${SITE_URL}/dmca`, priority: 0.3, changeFrequency: 'monthly' },
      { url: `${SITE_URL}/2257`, priority: 0.3, changeFrequency: 'monthly' },
      { url: `${SITE_URL}/acceptable-content`, priority: 0.3, changeFrequency: 'monthly' },
      { url: `${SITE_URL}/content-removal`, priority: 0.3, changeFrequency: 'monthly' },
    ];
  }

  // 1: Categories Sitemap
  if (id === 1) {
    let categories = defaultCategories;
    try {
      const data = await getCategoriesServer();
      categories = data.categories || defaultCategories;
    } catch {
      // Fallback to default categories if API fails
    }

    return categories.map((category) => ({
      url: `${SITE_URL}/category/${category.slug}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    }));
  }

  // 2+: Videos Sitemaps
  if (id >= 2) {
    const pageIndex = id - 2;
    const page = pageIndex + 1; // API is 1-indexed
    const perPage = 20000;
    
    try {
      const data = await getVideosServer({ page, per_page: perPage, sort: 'latest' });
      
      return (data.videos || []).map((video) => {
        const videoId = video.external_id || video.id;
        const lastmod = video.last_updated_at || video.added_at;
        
        return {
          url: `${SITE_URL}/video/${videoId}`,
          lastModified: lastmod ? new Date(lastmod) : new Date(),
          changeFrequency: 'weekly',
          priority: 0.7,
        };
      });
    } catch (error) {
      console.error(`Error generating video sitemap (id: ${id}):`, error);
      return []; // Return empty array on error so Next.js doesn't crash
    }
  }

  return [];
}
