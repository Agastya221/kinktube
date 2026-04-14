import { Suspense } from "react";
import VideoGrid from "@/components/VideoGrid";
import InfiniteVideoGrid from "@/components/InfiniteVideoGrid";
import CategoryNav, { defaultCategories } from "@/components/CategoryNav";
import Pagination from "@/components/Pagination";
import SearchBar from "@/components/SearchBar";
import { AdBanner, NativeAd } from "@/components/ads";
import { SortSelect } from "@/components/SortSelect";
import { getVideosServer, getCategoriesServer } from "@/lib/api";

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
  const sort = (params.sort as "latest" | "views" | "rating") || "latest";
  const useInfiniteScroll = params.infinite === "1";

  // Fetch data server-side
  let videosData;
  let categories;

  try {
    [videosData, categories] = await Promise.all([
      getVideosServer({ page, per_page: 24, sort }),
      getCategoriesServer().catch(() => ({ categories: defaultCategories })),
    ]);
  } catch {
    // Fallback for when API is not available
    videosData = { videos: [], total: 0, page: 1, per_page: 24, total_pages: 0 };
    categories = { categories: defaultCategories };
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Ad Banner */}
      <div className="mb-6 hidden md:block">
        <AdBanner position="top" />
      </div>

      {/* Hero Section */}
      <section className="mb-8">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3">
          <span className="text-accent">Curated</span> BDSM, Femdom & Fetish Videos
        </h1>
        <p className="text-foreground-muted text-lg mb-6 max-w-2xl">
          Explore a focused library of femdom, bondage, shibari, spanking, latex,
          chastity, and medical bondage scenes. Built for kink-first browsing, updated daily.
        </p>

        {/* Search Bar */}
        <Suspense fallback={null}>
          <SearchBar className="max-w-2xl" />
        </Suspense>
      </section>

      {/* Category Navigation */}
      <section className="mb-8">
        <CategoryNav categories={categories.categories} />
      </section>

      {/* Mobile Ad */}
      <div className="mb-6 md:hidden">
        <AdBanner position="mobile" />
      </div>

      {/* Sort Options */}
      <section className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold">
            {sort === "latest" ? "Latest Kink Videos" : sort === "views" ? "Most Viewed" : "Top Rated"}
          </h2>
          <p className="text-foreground-muted text-sm mt-1">
            {videosData.total.toLocaleString()} videos available
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-foreground-muted text-sm">Sort by:</span>
            <SortSelect current={sort} />
          </div>
        </div>
      </section>

      {/* Video Grid */}
      {useInfiniteScroll ? (
        <InfiniteVideoGrid
          initialVideos={videosData.videos}
          initialPage={videosData.page}
          totalPages={videosData.total_pages}
          queryParams={{ per_page: 24, sort }}
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
            />
          </Suspense>
        </>
      )}

      {/* Bottom Ad Banner */}
      <div className="mt-8 hidden md:block">
        <AdBanner position="bottom" />
      </div>

      {/* SEO Content */}
      <section className="mt-12 border-t border-border pt-8">
        <h2 className="text-lg font-semibold mb-4">About KinkTube</h2>
        <div className="text-foreground-muted text-sm space-y-3 max-w-3xl">
          <p>
            KinkTube is built for viewers who want BDSM-first discovery instead of generic tube content.
            We focus on femdom, rope bondage, latex, impact play, chastity, and other kink categories
            that are often buried on mainstream sites.
          </p>
          <p>
            Whether you&apos;re into dominant mistresses, shibari, caning, device bondage, or
            clinical restraint scenes, you&apos;ll find a more curated mix here. All content is free
            and new imports are filtered to stay closer to the site&apos;s BDSM focus.
          </p>
        </div>
      </section>
    </div>
  );
}
