import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import VideoGrid from "@/components/VideoGrid";
import Pagination from "@/components/Pagination";
import SearchBar from "@/components/SearchBar";
import { SortSelect } from "@/components/SortSelect";
import { AdBanner } from "@/components/ads";
import { getVideosServer, getPublicSiteSettingsServer } from "@/lib/api";
import { VIDEO_LIST_PAGE_SIZE } from "@/lib/constants";
import { fallbackPublicSiteSettings } from "@/lib/site-settings";

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    page?: string;
    sort?: string;
  }>;
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const params = await searchParams;
  const query = params.q || "";

  return {
    title: query ? `Search: ${query}` : "Search Videos",
    description: query
      ? `Search results for "${query}" - BDSM and fetish videos`
      : "Search our collection of BDSM and fetish videos",
    robots: {
      index: false,
      follow: true,
    },
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = params.q || "";
  const page = parseInt(params.page || "1", 10);
  const sort = params.sort as "latest" | "views" | "rating" | "extreme" | undefined;
  const siteSettings = await getPublicSiteSettingsServer().catch(() => fallbackPublicSiteSettings);
  const videosPerPage = siteSettings.content.videos_per_page || VIDEO_LIST_PAGE_SIZE;
  let videosData;

  try {
    if (query) {
      videosData = await getVideosServer({
        page,
        per_page: videosPerPage,
        q: query,
        ...(sort && { sort }),
      });
    } else {
      videosData = {
        videos: [],
        total: 0,
        page: 1,
        per_page: videosPerPage,
        total_pages: 0,
        has_more: false,
        total_exact: true,
      };
    }
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
  }

  const searchSummary = videosData.total_exact
    ? `Found ${videosData.total.toLocaleString()} video${videosData.total !== 1 ? "s" : ""}`
    : `Showing ${videosData.videos.length.toLocaleString()} result${videosData.videos.length !== 1 ? "s" : ""} on this page. More matches are available.`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Pagination SEO */}
      {query && page > 1 && (
        <link rel="prev" href={page === 2 ? `/search?q=${query}` : `/search?q=${query}&page=${page - 1}`} />
      )}
      {query && (videosData.has_more || page < videosData.total_pages) ? (
        <link rel="next" href={`/search?q=${query}&page=${page + 1}`} />
      ) : null}

      {/* Top Ad Banner */}
      <div className="mb-6 hidden md:block">
        <AdBanner position="top" />
      </div>

      <section className="mb-8">
        <div className="mb-6 flex justify-start">
          <Image 
            src="/logo.jpeg" 
            alt="KinkTube Logo" 
            width={240} 
            height={240} 
            className="h-16 md:h-20 w-auto object-contain"
            priority
            unoptimized
          />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-4">
          {query ? (
            <>
              Search results for: <span className="text-accent">&quot;{query}&quot;</span>
            </>
          ) : (
            "Search Videos"
          )}
        </h1>

        <div className="md:hidden mb-4">
          <Suspense fallback={null}>
            <SearchBar placeholder="Search videos..." className="w-full" />
          </Suspense>
        </div>

        {query && (
          <p className="text-foreground-muted mt-2">{searchSummary}</p>
        )}
      </section>

      <div className="my-5 flex justify-center md:hidden">
        <AdBanner position="mobile" />
      </div>

      {query ? (
        <>
          {videosData.videos.length > 0 && (
            <section className="mb-6 flex items-center justify-end">
              <div className="flex items-center gap-2">
                <span className="text-foreground-muted text-sm">Sort by:</span>
                <SortSelect current={sort} showRelevance />
              </div>
            </section>
          )}

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
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-foreground-muted text-lg">
            Enter a search term to find videos
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <p className="text-foreground-muted text-sm w-full mb-2">
              Popular searches:
            </p>
            {["extreme bondage", "brutal femdom", "predicament", "mummification", "severe discipline", "tight bondage", "torture"].map((term) => (
              <Link
                key={term}
                href={`/tag/${term.replace(/ /g, '-')}`}
                className="px-4 py-2 bg-background-tertiary text-foreground-muted rounded-full hover:bg-accent hover:text-white transition-colors"
              >
                {term}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Ad Banner */}
      <div className="mt-8 hidden md:block">
        <AdBanner position="bottom" />
      </div>
    </div>
  );
}
