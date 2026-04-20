import { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import VideoGrid from "@/components/VideoGrid";
import InfiniteVideoGrid from "@/components/InfiniteVideoGrid";
import Pagination from "@/components/Pagination";
import SearchBar from "@/components/SearchBar";
import { SortSelect } from "@/components/SortSelect";
import { getVideosServer } from "@/lib/api";
import { VIDEO_LIST_PAGE_SIZE } from "@/lib/constants";

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    page?: string;
    sort?: string;
    infinite?: string;
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
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = params.q || "";
  const page = parseInt(params.page || "1", 10);
  const useInfiniteScroll = params.infinite === "1";
  // Don't force a default sort - let Eporner decide based on relevance
  // Only pass sort if user explicitly selected one
  const sort = params.sort as "latest" | "views" | "rating" | "extreme" | undefined;

  // Fetch search results
  let videosData;

  try {
    if (query) {
      // Only include sort param if user explicitly selected one
      videosData = await getVideosServer({
        page,
        per_page: VIDEO_LIST_PAGE_SIZE,
        q: query,
        ...(sort && { sort }),
      });
    } else {
      videosData = {
        videos: [],
        total: 0,
        page: 1,
        per_page: VIDEO_LIST_PAGE_SIZE,
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
      per_page: VIDEO_LIST_PAGE_SIZE,
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
      {/* Search Header */}
      <section className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold mb-4">
          {query ? (
            <>
              Search results for: <span className="text-accent">&quot;{query}&quot;</span>
            </>
          ) : (
            "Search Videos"
          )}
        </h1>

        {/* Mobile Search Bar - hidden on desktop (desktop uses header search) */}
        <div className="md:hidden mb-4">
          <Suspense fallback={null}>
            <SearchBar placeholder="Search videos..." className="w-full" />
          </Suspense>
        </div>

        {query && (
          <p className="text-foreground-muted mt-2">
            {searchSummary}
          </p>
        )}
      </section>

      {/* Results */}
      {query ? (
        <>
          {/* Sort Options */}
          {videosData.videos.length > 0 && (
            <section className="mb-6 flex items-center justify-end">
              <div className="flex items-center gap-2">
                <span className="text-foreground-muted text-sm">Sort by:</span>
                <SortSelect current={sort} showRelevance />
              </div>
            </section>
          )}

          {useInfiniteScroll ? (
            <InfiniteVideoGrid
              initialVideos={videosData.videos}
              initialPage={videosData.page}
              totalPages={videosData.total_pages}
              queryParams={{
                per_page: VIDEO_LIST_PAGE_SIZE,
                q: query,
                ...(sort && { sort }),
              }}
            />
          ) : (
            <>
              {/* Video Grid */}
              <VideoGrid videos={videosData.videos} />

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
                href={`/search?q=${term}`}
                className="px-4 py-2 bg-background-tertiary text-foreground-muted rounded-full hover:bg-accent hover:text-white transition-colors"
              >
                {term}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
