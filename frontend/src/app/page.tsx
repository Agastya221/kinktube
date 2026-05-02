import { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import VideoGrid from "@/components/VideoGrid";
import CategoryNav from "@/components/CategoryNav";
import Pagination from "@/components/Pagination";
import { AdBanner } from "@/components/ads";
import { SortSelect } from "@/components/SortSelect";
import { getVideosServer, getCategoriesServer, getStatsServer, getPublicSiteSettingsServer } from "@/lib/api";
import { VIDEO_LIST_PAGE_SIZE } from "@/lib/constants";
import { defaultCategories } from "@/lib/default-categories";
import { fallbackPublicSiteSettings } from "@/lib/site-settings";

// ISR: serve from edge cache, regenerate every 60 seconds
export const revalidate = 60;

interface HomePageProps {
  searchParams: Promise<{
    page?: string;
    sort?: string;
  }>;
}

export async function generateMetadata({ searchParams }: HomePageProps): Promise<Metadata> {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);

  // Deep pagination pages get noindex to save crawl budget
  if (page > 5) {
    return {
      robots: { index: false, follow: true },
    };
  }

  return {};
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const sort = (params.sort as "latest" | "views" | "rating" | "extreme") || "latest";

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
      getVideosServer({ page, per_page: videosPerPage, sort }),
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
      {/* Pagination SEO: rel prev/next for search engines */}
      {page > 1 && (
        <link rel="prev" href={page === 2 ? "/" : `/?page=${page - 1}`} />
      )}
      {videosData.has_more || page < videosData.total_pages ? (
        <link rel="next" href={`/?page=${page + 1}`} />
      ) : null}

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

      <div className="my-5 flex justify-center md:hidden">
        <AdBanner position="mobile" />
      </div>

      <section className="mb-4 md:mb-6 flex items-center justify-between gap-2">
        <h2 className="text-base sm:text-xl md:text-2xl font-semibold truncate">
          {sort === "latest" ? "Latest Videos" : sort === "views" ? "Most Viewed" : sort === "extreme" ? "Most Extreme" : "Top Rated"}
        </h2>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-foreground-muted text-xs sm:text-sm hidden sm:inline">Sort:</span>
          <SortSelect current={sort} />
        </div>
      </section>

      <VideoGrid videos={videosData.videos} nativeAdAfter={8} />


      {!videosData.videos.length ? null : (
        <Suspense fallback={null}>
          <Pagination
            currentPage={videosData.page}
            totalPages={videosData.total_pages}
            total={videosData.total}
            hasMore={videosData.has_more}
            totalExact={videosData.total_exact}
          />
        </Suspense>
      )}

      {/* Bottom Ad Banner */}
      <div className="mt-8 hidden md:block">
        <AdBanner position="bottom" />
      </div>

      {/* SEO Content - Hidden on mobile */}
      <section className="hidden md:block mt-12 border-t border-border pt-8">
        <h2 className="text-lg font-semibold mb-4">Free BDSM Porn Videos &amp; Hardcore Fetish Tube — KinkTube</h2>
        <div className="text-foreground-muted text-sm space-y-3 max-w-3xl">
          <p>
            KinkTube is the underground destination for serious BDSM and kink enthusiasts. We
            specialize in extreme bondage, hardcore femdom, intense discipline, mummification,
            predicament scenes, shibari rope art, and other niche fetish content that mainstream
            tube sites bury deep in their libraries.
          </p>
          <p>
            Whether you&apos;re seeking strict dominatrices, tight rope bondage, severe corporal
            punishment, sensory deprivation, brutal whipping, or slave training scenes — you&apos;ll
            find the most intense free BDSM videos here. Our library is curated specifically for the
            hardcore kink community and updated daily with new bondage, femdom, latex, and fetish
            content across 30+ specialist categories.
          </p>
          <p>
            Browse by category:{" "}
            <Link href="/category/femdom" className="text-accent hover:underline">Femdom</Link>,{" "}
            <Link href="/category/bondage" className="text-accent hover:underline">Bondage</Link>,{" "}
            <Link href="/category/shibari" className="text-accent hover:underline">Shibari</Link>,{" "}
            <Link href="/category/whipping" className="text-accent hover:underline">Whipping</Link>,{" "}
            <Link href="/category/latex" className="text-accent hover:underline">Latex</Link>,{" "}
            <Link href="/category/cbt" className="text-accent hover:underline">CBT</Link>,{" "}
            <Link href="/category/chastity" className="text-accent hover:underline">Chastity</Link>,{" "}
            <Link href="/category/pet-play" className="text-accent hover:underline">Pet Play</Link> and many more.
          </p>
        </div>
      </section>
    </div>
  );
}
