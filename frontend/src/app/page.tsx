import { Suspense } from "react";
import VideoGrid from "@/components/VideoGrid";
import InfiniteVideoGrid from "@/components/InfiniteVideoGrid";
import CategoryNav, { defaultCategories } from "@/components/CategoryNav";
import Pagination from "@/components/Pagination";
import { AdBanner, NativeAd } from "@/components/ads";
import { SortSelect } from "@/components/SortSelect";
import { getVideosServer, getCategoriesServer, getStatsServer } from "@/lib/api";
import { VIDEO_LIST_PAGE_SIZE } from "@/lib/constants";

// ISR: Revalidate homepage every hour
export const revalidate = 3600;

interface HomePageProps {
  searchParams: Promise<{
    page?: string;
    sort?: string;
    infinite?: string;
  }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  // Default to mixed/latest for homepage - backend handles smart ordering
  const sort = (params.sort as "latest" | "views" | "rating" | "extreme") || "latest";
  const useInfiniteScroll = params.infinite === "1";

  // Fetch data server-side
  let videosData;
  let categories;
  let stats;

  try {
    [videosData, categories, stats] = await Promise.all([
      getVideosServer({ page, per_page: VIDEO_LIST_PAGE_SIZE, sort }),
      getCategoriesServer().catch(() => ({ categories: defaultCategories })),
      getStatsServer().catch(() => ({ total_videos: 0 })),
    ]);
  } catch {
    // Fallback for when API is not available
    videosData = {
      videos: [],
      total: 0,
      page: 1,
      per_page: VIDEO_LIST_PAGE_SIZE,
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
          <span className="text-accent">Extreme</span> BDSM & Hardcore Fetish
        </h1>
        <p className="text-foreground-muted text-lg max-w-2xl">
          Dive into intense femdom, predicament bondage, severe discipline, mummification,
          and hardcore fetish scenes. Curated for serious kink enthusiasts. Not your average tube site.
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

      {/* Sort Options - Compact on mobile */}
      <section className="mb-4 md:mb-6 flex items-center justify-between gap-2">
        <h2 className="text-base sm:text-xl md:text-2xl font-semibold truncate">
          {sort === "latest" ? "Latest Videos" : sort === "views" ? "Most Viewed" : sort === "extreme" ? "Most Extreme" : "Top Rated"}
        </h2>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-foreground-muted text-xs sm:text-sm hidden sm:inline">Sort:</span>
          <SortSelect current={sort} />
        </div>
      </section>

      {/* Video Grid */}
      {useInfiniteScroll ? (
        <InfiniteVideoGrid
          initialVideos={videosData.videos}
          initialPage={videosData.page}
          totalPages={videosData.total_pages}
          queryParams={{ per_page: VIDEO_LIST_PAGE_SIZE, sort }}
        />
      ) : (
        <>
          <VideoGrid videos={videosData.videos} />

          {/* Native Ad in Grid */}
          {videosData.videos.length > 12 && (
            <div className="my-8 flex justify-center">
              <NativeAd className="max-w-sm" />
            </div>
          )}

          {/* Pagination */}
          <Suspense fallback={null}>
            <Pagination
              currentPage={videosData.page}
              totalPages={videosData.total_pages}
              total={videosData.total}
              hasMore={videosData.has_more}
              totalExact={videosData.total_exact}
            />
          </Suspense>
        </>
      )}

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
