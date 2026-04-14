import { Metadata } from "next";
import { Suspense } from "react";
import VideoGrid from "@/components/VideoGrid";
import InfiniteVideoGrid from "@/components/InfiniteVideoGrid";
import CategoryNav, { defaultCategories } from "@/components/CategoryNav";
import Pagination from "@/components/Pagination";
import { AdBanner } from "@/components/ads";
import { SortSelect } from "@/components/SortSelect";
import { getVideosServer, getCategoriesServer } from "@/lib/api";

// ISR: Revalidate category pages every hour
export const revalidate = 3600;

interface CategoryPageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    page?: string;
    sort?: string;
    infinite?: string;
  }>;
}

// Category metadata for SEO
const categoryMeta: Record<string, { title: string; description: string }> = {
  femdom: {
    title: "Femdom Videos - Female Domination",
    description: "Watch free femdom videos featuring dominant women, mistresses, and female domination scenes. High-quality femdom content updated daily.",
  },
  bondage: {
    title: "Bondage Videos - Rope & Restraints",
    description: "Free bondage videos featuring rope bondage, restraints, and tie-up scenes. Watch the best bondage content online.",
  },
  bdsm: {
    title: "BDSM Videos - Bondage Domination",
    description: "Explore free BDSM videos including bondage, domination, sadism, and masochism. Premium BDSM content curated for enthusiasts.",
  },
  slave: {
    title: "Slave Training Videos",
    description: "Watch free slave training videos featuring submissive training, obedience, and master/slave dynamics.",
  },
  submission: {
    title: "Submission Videos - Submissive Play",
    description: "Free submission videos featuring submissive partners, obedience training, and dom/sub relationships.",
  },
  latex: {
    title: "Latex Fetish Videos",
    description: "Watch free latex fetish videos featuring rubber catsuits, shiny outfits, and latex fashion.",
  },
  leather: {
    title: "Leather Fetish Videos",
    description: "Free leather fetish videos featuring leather gear, outfits, and accessories.",
  },
  spanking: {
    title: "Spanking Videos - Impact Play",
    description: "Watch free spanking videos featuring OTK spanking, paddling, and impact play scenes.",
  },
  strapon: {
    title: "Strapon & Pegging Videos",
    description: "Free strapon videos featuring pegging, strap-on domination, and female-led penetration.",
  },
  dominatrix: {
    title: "Dominatrix Videos - Pro Domme",
    description: "Watch free dominatrix videos featuring professional dommes, dungeon scenes, and femdom sessions.",
  },
};

// Generate metadata for SEO
export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;

  // Format category name
  const categoryName = slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const meta = categoryMeta[slug] || {
    title: `${categoryName} Videos`,
    description: `Browse the best ${categoryName} videos. High quality BDSM and fetish content curated for enthusiasts.`,
  };

  return {
    title: meta.title,
    description: meta.description,
    keywords: [slug, categoryName, "BDSM", "fetish", "videos", "free"].join(", "),
    openGraph: {
      title: `${meta.title} | KinkTube`,
      description: meta.description,
    },
    alternates: {
      canonical: `/category/${slug}`,
    },
  };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const search = await searchParams;
  const page = parseInt(search.page || "1", 10);
  const sort = (search.sort as "latest" | "views" | "rating") || "latest";
  const useInfiniteScroll = search.infinite === "1";

  // Format category name for display
  const categoryName = slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  // Fetch data server-side
  let videosData;
  let categories;

  try {
    [videosData, categories] = await Promise.all([
      getVideosServer({ page, per_page: 24, sort, category: slug }),
      getCategoriesServer().catch(() => ({ categories: defaultCategories })),
    ]);
  } catch {
    videosData = { videos: [], total: 0, page: 1, per_page: 24, total_pages: 0 };
    categories = { categories: defaultCategories };
  }

  const meta = categoryMeta[slug];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Ad Banner */}
      <div className="mb-6 hidden md:block">
        <AdBanner position="top" />
      </div>

      {/* Header */}
      <section className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          <span className="text-accent">{categoryName}</span> Videos
        </h1>
        {meta && (
          <p className="text-foreground-muted max-w-2xl">{meta.description}</p>
        )}
        <p className="text-foreground-muted mt-2">
          {videosData.total.toLocaleString()} videos in this category
        </p>
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
      <section className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {sort === "latest" ? "Latest" : sort === "views" ? "Most Viewed" : "Top Rated"}
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-foreground-muted text-sm hidden sm:inline">Sort by:</span>
          <SortSelect current={sort} />
        </div>
      </section>

      {/* Video Grid */}
      {useInfiniteScroll ? (
        <InfiniteVideoGrid
          initialVideos={videosData.videos}
          initialPage={videosData.page}
          totalPages={videosData.total_pages}
          queryParams={{ per_page: 24, sort, category: slug }}
        />
      ) : (
        <>
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
      )}

      {/* Bottom Ad Banner */}
      <div className="mt-8 hidden md:block">
        <AdBanner position="bottom" />
      </div>

      {/* SEO Content for Category */}
      {meta && (
        <section className="mt-12 border-t border-border pt-8">
          <h2 className="text-lg font-semibold mb-4">About {categoryName} Videos</h2>
          <p className="text-foreground-muted text-sm max-w-3xl">
            {meta.description} Our collection features the highest quality {categoryName.toLowerCase()} content
            from premium studios and independent creators. All videos are free to watch and
            new content is added daily.
          </p>
        </section>
      )}
    </div>
  );
}
