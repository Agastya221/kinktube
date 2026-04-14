import { Metadata } from "next";
import { Suspense } from "react";
import VideoGrid from "@/components/VideoGrid";
import Pagination from "@/components/Pagination";
import SearchBar from "@/components/SearchBar";
import { SortSelect } from "@/components/SortSelect";
import { getVideosServer } from "@/lib/api";

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
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = params.q || "";
  const page = parseInt(params.page || "1", 10);
  const sort = (params.sort as "latest" | "views" | "rating" | "extreme") || "latest";

  // Fetch search results
  let videosData;

  try {
    if (query) {
      videosData = await getVideosServer({ page, per_page: 24, sort, q: query });
    } else {
      videosData = { videos: [], total: 0, page: 1, per_page: 24, total_pages: 0 };
    }
  } catch {
    videosData = { videos: [], total: 0, page: 1, per_page: 24, total_pages: 0 };
  }

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

        <Suspense fallback={null}>
          <SearchBar className="max-w-2xl" placeholder="Search for videos..." />
        </Suspense>

        {query && (
          <p className="text-foreground-muted mt-4">
            Found {videosData.total.toLocaleString()} video{videosData.total !== 1 ? "s" : ""}
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
                <SortSelect current={sort} />
              </div>
            </section>
          )}

          {/* Video Grid */}
          <VideoGrid videos={videosData.videos} />

          {/* Pagination */}
          <Suspense fallback={null}>
            <Pagination
              currentPage={videosData.page}
              totalPages={videosData.total_pages}
              total={videosData.total}
            />
          </Suspense>
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
              <a
                key={term}
                href={`/search?q=${term}`}
                className="px-4 py-2 bg-background-tertiary text-foreground-muted rounded-full hover:bg-accent hover:text-white transition-colors"
              >
                {term}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
