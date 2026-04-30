import { Metadata } from "next";
import { Suspense } from "react";
import VideoGrid from "@/components/VideoGrid";
import Pagination from "@/components/Pagination";
import CategoryNav from "@/components/CategoryNav";
import { AdBanner } from "@/components/ads";
import { SortSelect } from "@/components/SortSelect";
import { getVideosServer, getCategoriesServer, getPublicSiteSettingsServer } from "@/lib/api";
import { VIDEO_LIST_PAGE_SIZE } from "@/lib/constants";
import { defaultCategories } from "@/lib/default-categories";
import { fallbackPublicSiteSettings } from "@/lib/site-settings";

// ISR: Cache tag pages to improve TTFB and core web vitals
export const revalidate = 60;

interface TagPageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    page?: string;
    sort?: string;
  }>;
}

export async function generateMetadata({ params, searchParams }: TagPageProps): Promise<Metadata> {
  const { slug } = await params;
  const search = await searchParams;
  const page = parseInt(search.page || "1", 10);

  // Convert slug back to readable tag string (e.g., "hardcore-femdom" -> "hardcore femdom")
  const tagName = decodeURIComponent(slug).replace(/-/g, " ");
  
  // Format with title case
  const titleCaseTag = tagName
    .split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const title = page > 1 
    ? `${titleCaseTag} Videos - Free BDSM Porn - Page ${page}` 
    : `${titleCaseTag} Videos - Free BDSM Porn & Fetish Scenes`;

  // Apply noindex to deep pagination to save crawl budget (Part 5)
  if (page > 5) {
    return {
      title,
      robots: { index: false, follow: true },
    };
  }

  return {
    title,
    description: `Watch free ${titleCaseTag} BDSM videos on KinkTube. The best extreme fetish and kink porn featuring ${titleCaseTag} updated daily.`,
    keywords: [tagName, "BDSM", "fetish", "porn", "videos", "kink"].join(", "),
    alternates: {
      canonical: `/tag/${slug}`,
    },
  };
}

export default async function TagPage({ params, searchParams }: TagPageProps) {
  const { slug } = await params;
  const search = await searchParams;
  const page = parseInt(search.page || "1", 10);
  const sort = (search.sort as "latest" | "views" | "rating" | "extreme" | undefined) || "latest";
  
  const siteSettings = await getPublicSiteSettingsServer().catch(() => fallbackPublicSiteSettings);
  const videosPerPage = siteSettings.content.videos_per_page || VIDEO_LIST_PAGE_SIZE;

  // Convert slug to search query
  const query = decodeURIComponent(slug).replace(/-/g, " ");
  const titleCaseTag = query
    .split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  let videosData;
  let categories;

  try {
    [videosData, categories] = await Promise.all([
      getVideosServer({
        page,
        per_page: videosPerPage,
        q: query,
        ...(sort && sort !== "latest" && { sort }),
      }),
      getCategoriesServer().catch(() => ({ categories: defaultCategories })),
    ]);
  } catch {
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
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 md:py-6">
      {/* Pagination SEO */}
      {page > 1 && (
        <link rel="prev" href={page === 2 ? `/tag/${slug}` : `/tag/${slug}?page=${page - 1}`} />
      )}
      {videosData.has_more || page < videosData.total_pages ? (
        <link rel="next" href={`/tag/${slug}?page=${page + 1}`} />
      ) : null}

      {/* Top Ad Banner */}
      <div className="mb-6 hidden md:block">
        <AdBanner position="top" />
      </div>

      {/* Header */}
      <section className="hidden md:block mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          <span className="text-accent">{titleCaseTag}</span> Videos
        </h1>
        <p className="text-foreground-muted">
          Browse our collection of free {query} BDSM videos and extreme fetish porn.
        </p>
      </section>

      {/* Mobile Header */}
      <section className="md:hidden mb-3">
        <h1 className="text-xl font-bold">
          <span className="text-accent">{titleCaseTag}</span>
        </h1>
      </section>

      {/* Category Navigation */}
      <section className="mb-4 md:mb-8">
        <CategoryNav categories={categories.categories} />
      </section>

      <div className="my-5 flex justify-center md:hidden">
        <AdBanner position="mobile" />
      </div>

      <section className="mb-4 md:mb-6 flex items-center justify-between gap-2">
        <h2 className="text-base sm:text-xl font-semibold truncate">
          {sort === "latest"
            ? "Latest"
            : sort === "views"
              ? "Most Viewed"
              : sort === "extreme"
                ? "Most Extreme"
                : "Top Rated"}
        </h2>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-foreground-muted text-xs sm:text-sm hidden sm:inline">Sort:</span>
          <SortSelect current={sort} showRelevance />
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
    </div>
  );
}
