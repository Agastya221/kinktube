import { Metadata } from "next";
import CategoryNav from "@/components/CategoryNav";
import PaginatedVideoBrowser from "@/components/PaginatedVideoBrowser";
import { AdBanner } from "@/components/ads";
import { getVideosServer, getCategoriesServer, getPublicSiteSettingsServer } from "@/lib/api";
import { VIDEO_LIST_PAGE_SIZE } from "@/lib/constants";
import { defaultCategories } from "@/lib/default-categories";
import { fallbackPublicSiteSettings } from "@/lib/site-settings";

// ISR: Revalidate category pages every hour
export const revalidate = 3600;

interface CategoryPageProps {
  params: Promise<{
    slug: string;
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
  shibari: {
    title: "Shibari Videos - Rope Art & Suspension",
    description: "Watch free shibari videos featuring Japanese rope bondage, intricate ties, and suspension-focused scenes.",
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
  chastity: {
    title: "Chastity Videos - Tease & Denial",
    description: "Watch free chastity videos featuring tease and denial, orgasm control, and keyholder dynamics.",
  },
  "device-bondage": {
    title: "Device Bondage Videos",
    description: "Free device bondage videos featuring mechanical restraints, machines, and advanced bondage setups.",
  },
  "medical-bondage": {
    title: "Medical Bondage Videos",
    description: "Watch free medical bondage videos featuring clinical restraints, fetish exams, and medical play.",
  },
  vacbed: {
    title: "Vacbed Videos - Vacuum Bed Bondage",
    description: "Watch free vacbed videos featuring vacuum bed bondage, enclosure play, and airtight fetish scenes.",
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
  caning: {
    title: "Caning Videos - Intense Impact Play",
    description: "Free caning videos featuring canes, crops, and harder impact play for BDSM fans who like heavier punishment scenes.",
  },
  strapon: {
    title: "Strapon & Pegging Videos",
    description: "Free strapon videos featuring pegging, strap-on domination, and female-led penetration.",
  },
  dominatrix: {
    title: "Dominatrix Videos - Pro Domme",
    description: "Watch free dominatrix videos featuring professional dommes, dungeon scenes, and femdom sessions.",
  },
  "public-humiliation": {
    title: "Public Humiliation Videos",
    description: "Watch free public humiliation videos featuring exposure, embarrassment, degradation, and humiliation-focused BDSM scenes.",
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

export function generateStaticParams() {
  return defaultCategories.map((category) => ({
    slug: category.slug,
  }));
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const siteSettings = await getPublicSiteSettingsServer().catch(() => fallbackPublicSiteSettings);
  const videosPerPage = siteSettings.content.videos_per_page || VIDEO_LIST_PAGE_SIZE;

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
      getVideosServer({
        page: 1,
        per_page: videosPerPage,
        category: slug,
        sort: "latest",
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

  const meta = categoryMeta[slug];
  const currentCategory = categories.categories.find((category) => category.slug === slug);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 md:py-6">
      {/* Top Ad Banner */}
      <div className="mb-6 hidden md:block">
        <AdBanner position="top" />
      </div>

      {/* Header - Hidden on mobile for content-first */}
      <section className="hidden md:block mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          <span className="text-accent">{categoryName}</span> Videos
        </h1>
        {meta && (
          <div className="space-y-2 max-w-2xl">
            <p className="text-foreground-muted">{meta.description}</p>
            {currentCategory && currentCategory.video_count > 0 && (
              <p className="text-sm font-medium uppercase tracking-[0.14em] text-accent/80">
                {currentCategory.video_count.toLocaleString()} indexed videos in this category
              </p>
            )}
          </div>
        )}
      </section>

      {/* Mobile Header - Compact */}
      <section className="md:hidden mb-3">
        <h1 className="text-xl font-bold">
          <span className="text-accent">{categoryName}</span>
        </h1>
      </section>

      {/* Category Navigation */}
      <section className="mb-4 md:mb-8">
        <CategoryNav categories={categories.categories} />
      </section>

      <PaginatedVideoBrowser
        initialData={videosData}
        pageSize={videosPerPage}
        defaultSort="latest"
        headingVariant="category"
        queryParams={{ category: slug }}
      />

      {/* Mobile Ad - After content */}
      <div className="mt-6 md:hidden">
        <AdBanner position="mobile" />
      </div>

      {/* Bottom Ad Banner */}
      <div className="mt-8 hidden md:block">
        <AdBanner position="bottom" />
      </div>

      {/* SEO Content for Category - Hidden on mobile */}
      {meta && (
        <section className="hidden md:block mt-12 border-t border-border pt-8">
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
