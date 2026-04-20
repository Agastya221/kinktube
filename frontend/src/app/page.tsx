import CategoryNav from "@/components/CategoryNav";
import PaginatedVideoBrowser from "@/components/PaginatedVideoBrowser";
import { AdBanner } from "@/components/ads";
import { getVideosServer, getCategoriesServer, getStatsServer, getPublicSiteSettingsServer } from "@/lib/api";
import { VIDEO_LIST_PAGE_SIZE } from "@/lib/constants";
import { defaultCategories } from "@/lib/default-categories";
import { fallbackPublicSiteSettings } from "@/lib/site-settings";

// ISR: Revalidate homepage every hour
export const revalidate = 3600;

export default async function HomePage() {
  // Fetch data server-side
  let videosData;
  let categories;
  let stats;
  let siteSettings = fallbackPublicSiteSettings;
  let videosPerPage = VIDEO_LIST_PAGE_SIZE;

  try {
    siteSettings = await getPublicSiteSettingsServer().catch(() => fallbackPublicSiteSettings);
    videosPerPage = siteSettings.content.videos_per_page || VIDEO_LIST_PAGE_SIZE;

    [videosData, categories, stats] = await Promise.all([
      getVideosServer({ page: 1, per_page: videosPerPage, sort: "latest" }),
      getCategoriesServer().catch(() => ({ categories: defaultCategories })),
      getStatsServer().catch(() => ({ total_videos: 0 })),
    ]);
  } catch {
    // Fallback for when API is not available
    videosData = {
      videos: [],
      total: 0,
      page: 1,
      per_page: videosPerPage,
      total_pages: 0,
      has_more: false,
      total_exact: true,
    };
    categories = { categories: defaultCategories };
    stats = { total_videos: 0 };
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 md:py-6">
      {/* Top Ad Banner */}
      <div className="mb-6 hidden md:block">
        <AdBanner position="top" />
      </div>

      {/* Hero Section - Hidden on mobile for content-first experience */}
      <section className="hidden md:block mb-8">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3">
          <span className="text-accent">{siteSettings.branding.hero_accent}</span>{" "}
          {siteSettings.branding.hero_title}
        </h1>
        <p className="text-foreground-muted text-lg max-w-2xl">
          {siteSettings.branding.hero_description}
        </p>
        {stats.total_videos > 0 && (
          <p className="mt-4 text-sm font-medium uppercase tracking-[0.18em] text-accent/80">
            {stats.total_videos.toLocaleString()} indexed videos and growing
          </p>
        )}
      </section>

      {/* Category Navigation - Collapsible on mobile for content-first */}
      <section className="mb-4 md:mb-8">
        <CategoryNav categories={categories.categories} />
      </section>

      <PaginatedVideoBrowser
        initialData={videosData}
        pageSize={videosPerPage}
        defaultSort="latest"
        headingVariant="home"
        showNativeAd
      />

      {/* Mobile Ad - After content */}
      <div className="mt-6 md:hidden">
        <AdBanner position="mobile" />
      </div>

      {/* Bottom Ad Banner */}
      <div className="mt-8 hidden md:block">
        <AdBanner position="bottom" />
      </div>

      {/* SEO Content - Hidden on mobile */}
      <section className="hidden md:block mt-12 border-t border-border pt-8">
        <h2 className="text-lg font-semibold mb-4">About KinkTube</h2>
        <div className="text-foreground-muted text-sm space-y-3 max-w-3xl">
          <p>
            KinkTube is the underground destination for serious BDSM enthusiasts. We specialize in extreme
            bondage, hardcore femdom, intense discipline, mummification, predicament scenes, and
            other niche fetish content that mainstream tube sites bury.
          </p>
          <p>
            Whether you&apos;re seeking cruel mistresses, tight rope bondage, severe punishment, sensory
            deprivation, or brutal discipline scenes, you&apos;ll find the most intense content here.
            Curated specifically for the hardcore kink community.
          </p>
        </div>
      </section>
    </div>
  );
}
