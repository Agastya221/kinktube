import { Metadata } from "next";
import { Suspense } from "react";
import VideoGrid from "@/components/VideoGrid";
import CategoryNav from "@/components/CategoryNav";
import Pagination from "@/components/Pagination";
import { AdBanner } from "@/components/ads";
import { SortSelect } from "@/components/SortSelect";
import { getVideosServer, getCategoriesServer, getPublicSiteSettingsServer } from "@/lib/api";
import { VIDEO_LIST_PAGE_SIZE } from "@/lib/constants";
import { defaultCategories } from "@/lib/default-categories";
import { fallbackPublicSiteSettings } from "@/lib/site-settings";

// ISR: serve from edge cache, regenerate every 60 seconds
export const revalidate = 60;

interface CategoryPageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    page?: string;
    sort?: string;
  }>;
}

// Category metadata for SEO — covers every category slug in the backend
const categoryMeta: Record<string, { title: string; description: string }> = {
  // ── Core dynamics ────────────────────────────────────────────────────────────
  bdsm: {
    title: "BDSM Videos - Bondage, Domination & Fetish Porn",
    description:
      "Watch thousands of free BDSM videos featuring bondage, domination, submission, sadism and masochism. Premium BDSM content curated for true fetish enthusiasts, updated daily.",
  },
  femdom: {
    title: "Femdom Videos - Female Domination & Dominatrix Porn",
    description:
      "Free femdom porn featuring powerful mistresses, strict dominatrices, and extreme female domination scenes. Watch dominant women take full control in the best femdom videos online.",
  },
  bondage: {
    title: "Bondage Videos - Rope Bondage, Restraints & Tie-Up Porn",
    description:
      "Free bondage videos featuring rope bondage, handcuffs, spreader bars, and all forms of restraint play. Browse hundreds of tie-up and inescapable bondage scenes updated daily.",
  },
  dominatrix: {
    title: "Dominatrix Videos - Professional Domme & Dungeon Scenes",
    description:
      "Watch free dominatrix videos featuring professional dommes, leather-clad mistresses, and dungeon sessions. The best pro domme content for BDSM fans who want real power exchange.",
  },
  submission: {
    title: "Submission Videos - Submissive Training & Dom/Sub Play",
    description:
      "Free submission porn featuring obedient subs, kneeling slaves, and intense dom/sub dynamics. Watch the best submissive training and power exchange videos updated daily.",
  },
  slave: {
    title: "Slave Training Videos - Master/Slave BDSM Porn",
    description:
      "Free slave training videos featuring collared slaves, strict masters and mistresses, and intense obedience training. Real master/slave dynamics in HD, updated every day.",
  },
  // ── Impact play ──────────────────────────────────────────────────────────────
  spanking: {
    title: "Spanking Videos - OTK Spanking & Impact Play Porn",
    description:
      "Watch free spanking videos featuring over-the-knee paddling, hand spanking, and all forms of impact play. Red bottoms and strict disciplinarians in the best spanking porn online.",
  },
  caning: {
    title: "Caning Videos - Strict Cane & Corporal Punishment Porn",
    description:
      "Free caning videos featuring strict cane strokes, judicial punishment, and severe corporal discipline. Watch the hardest caning scenes online in full HD.",
  },
  whipping: {
    title: "Whipping Videos - Whips, Floggers & Flagellation Porn",
    description:
      "Watch free whipping porn featuring singletails, floggers, riding crops, and intense flagellation scenes. Browse the largest collection of whipping and flogging videos online.",
  },
  // ── Bondage sub-genres ───────────────────────────────────────────────────────
  shibari: {
    title: "Shibari Videos - Japanese Rope Bondage & Kinbaku Art",
    description:
      "Watch free shibari and kinbaku videos featuring intricate Japanese rope bondage, artistic suspension ties, and beautiful rope art. The finest shibari content curated for rope bondage enthusiasts.",
  },
  "device-bondage": {
    title: "Device Bondage Videos - Machines & Mechanical Restraints",
    description:
      "Free device bondage videos featuring metal restraints, bondage machines, stocks, and advanced mechanical bondage setups. Watch intense device bondage scenes in HD.",
  },
  "medical-bondage": {
    title: "Medical Bondage Videos - Clinical Restraint & Medical Fetish",
    description:
      "Watch free medical bondage videos featuring clinical restraints, gynaecology chairs, fetish exams, and medical play scenarios. The best medical BDSM content online.",
  },
  vacbed: {
    title: "Vacbed Videos - Vacuum Bed Bondage & Enclosure Fetish",
    description:
      "Free vacbed videos featuring vacuum bed bondage, airtight enclosure play, and latex vacuum fetish. Watch the most intense vacbed and encasement scenes online.",
  },
  "extreme-bondage": {
    title: "Extreme Bondage Videos - Inescapable & Strict Restraint",
    description:
      "Watch free extreme bondage videos featuring tight inescapable restraints, straitjackets, armbinders, and severe bondage positions. For fans of the most intense bondage available.",
  },
  predicament: {
    title: "Predicament Bondage Videos - Forced Position & Stress Play",
    description:
      "Free predicament bondage videos where bound submissives face impossible choices and stress positions. Watch the most creative and intense predicament BDSM scenes online.",
  },
  mummification: {
    title: "Mummification Videos - Full Body Wrapping & Encasement",
    description:
      "Watch free mummification videos featuring full body wrapping in bandages, cling film, and tape for total encasement and sensory overload. Browse the best mummification fetish porn.",
  },
  // ── Fetish attire ─────────────────────────────────────────────────────────────
  latex: {
    title: "Latex Fetish Videos - Rubber Catsuits & Latex BDSM Porn",
    description:
      "Free latex fetish videos featuring rubber catsuits, shiny latex outfits, and latex BDSM scenes. Watch the best latex and heavy rubber fetish content with dominant mistresses in full latex.",
  },
  leather: {
    title: "Leather Fetish Videos - Leather BDSM Gear & Outfits",
    description:
      "Watch free leather fetish videos featuring leather harnesses, corsets, gloves, and full leather BDSM outfit scenes. The finest leather kink content updated daily.",
  },
  // ── Specialty acts ────────────────────────────────────────────────────────────
  strapon: {
    title: "Strapon & Pegging Videos - Strap-On Domination Porn",
    description:
      "Free strapon and pegging videos featuring dominant women and their strap-ons in intense female-led penetration scenes. Watch the best pegging and strapon domination porn online.",
  },
  facesitting: {
    title: "Facesitting Videos - Smothering & Queening Fetish Porn",
    description:
      "Watch free facesitting videos featuring dominant women smothering subs with their bottoms and pussies. Browse the best queening, smothering, and facesitting fetish content online.",
  },
  "foot-fetish": {
    title: "Foot Fetish Videos - Foot Worship & Sole Fetish Porn",
    description:
      "Free foot fetish videos featuring foot worship, toe sucking, sole licking, and strict boot worship scenes. Watch submissive foot worship in the best foot fetish content online.",
  },
  cbt: {
    title: "CBT Videos - Cock and Ball Torture Fetish Porn",
    description:
      "Watch free CBT videos featuring cock and ball torture, ball busting, genital spanking, and intense male BDSM play. The most intense CBT fetish content curated for extreme fans.",
  },
  chastity: {
    title: "Chastity Videos - Orgasm Control & Tease and Denial Porn",
    description:
      "Free chastity videos featuring chastity belt play, orgasm control, tease and denial, and strict keyholder dynamics. Watch the best male chastity and orgasm denial scenes online.",
  },
  "public-humiliation": {
    title: "Public Humiliation Videos - Degradation & Exposure Fetish",
    description:
      "Watch free public humiliation videos featuring degradation, exposure, embarrassment, and intense humiliation play. Browse the best public disgrace and humiliation BDSM content.",
  },
  // ── Psychological/roleplay ────────────────────────────────────────────────────
  "sensory-deprivation": {
    title: "Sensory Deprivation Videos - Blindfold, Hood & Isolation Play",
    description:
      "Free sensory deprivation videos featuring hoods, blindfolds, ear plugs, and complete isolation bondage. Watch the best sensory deprivation and blackout bondage scenes online.",
  },
  "severe-discipline": {
    title: "Severe Discipline Videos - Harsh Punishment & Strict Correction",
    description:
      "Watch free severe discipline videos featuring harsh punishment, strict correction, corporal discipline, and brutal BDSM scenes. For fans of the most extreme discipline content.",
  },
  "pet-play": {
    title: "Pet Play Videos - Pony Play, Puppy Play & Human Pet Porn",
    description:
      "Free pet play videos featuring pony play, puppy play, kitten play, and human pet training. Watch the most creative and adorable BDSM pet play scenes with strict handlers.",
  },
};


export async function generateMetadata({ params, searchParams }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const search = await searchParams;
  const page = parseInt(search?.page || "1", 10);

  // Format category name
  const categoryName = slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const meta = categoryMeta[slug] || {
    description: `Browse the best ${categoryName} porn videos. High quality BDSM and fetish tube content curated for enthusiasts.`,
  };

  const baseTitle = `Free ${categoryName} Porn Videos - BDSM Tube`;
  const title = page > 1 ? `${baseTitle} - Page ${page}` : baseTitle;

  // Apply noindex to deep pagination to save crawl budget
  if (page > 5) {
    return {
      title,
      robots: { index: false, follow: true },
    };
  }

  return {
    title,
    description: meta.description,
    keywords: [slug, categoryName, "BDSM", "fetish", "videos", "free"].join(", "),
    openGraph: {
      title: `${title} | KinkTube`,
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
  const sort = (search.sort as "latest" | "views" | "rating" | "extreme" | undefined) || "latest";
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
        page,
        per_page: videosPerPage,
        category: slug,
        sort,
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

  const baseTitle = `Free ${categoryName} Porn Videos - BDSM Tube`;
  const h1Parts = baseTitle.split(" - ");
  const h1Primary = h1Parts[0];
  const h1Secondary = h1Parts.length > 1 ? ` - ${h1Parts[1]}` : "";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 md:py-6">
      {/* Pagination SEO */}
      {page > 1 && (
        <link rel="prev" href={page === 2 ? `/category/${slug}` : `/category/${slug}?page=${page - 1}`} />
      )}
      {videosData.has_more || page < videosData.total_pages ? (
        <link rel="next" href={`/category/${slug}?page=${page + 1}`} />
      ) : null}

      {/* Top Ad Banner */}
      <div className="mb-6 hidden md:block">
        <AdBanner position="top" />
      </div>

      {/* Header - Hidden on mobile for content-first */}
      <section className="hidden md:block mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          <span className="text-accent">{h1Primary}</span>
          <span className="text-foreground-muted/80 font-medium text-2xl sm:text-3xl">{h1Secondary}</span>
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

      {/* SEO Content for Category - Hidden on mobile */}
      {meta && (
        <section className="hidden md:block mt-12 border-t border-border pt-8">
          <h2 className="text-xl font-semibold mb-4">Watch {h1Primary} &amp; Discover More</h2>
          <details className="group [&_summary::-webkit-details-marker]:hidden">
            <summary className="cursor-pointer text-foreground-muted text-sm font-medium hover:text-accent transition-colors flex items-center gap-2 outline-none">
              <span className="group-open:hidden">Read more about {categoryName.toLowerCase()}...</span>
              <span className="hidden group-open:block">Show less</span>
              <svg
                className="w-4 h-4 transition-transform group-open:rotate-180"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            
            <div className="mt-4 text-foreground-muted text-sm space-y-3 max-w-4xl leading-relaxed">
              <p>
                {meta.description} Welcome to the most comprehensive library of <strong>{categoryName.toLowerCase()} videos</strong> available anywhere online. 
                Our platform specializes in extreme, niche, and underground fetish content that caters specifically to the hardcore BDSM community.
              </p>
              <p>
                Whether you are exploring this kink for the first time or you are an experienced practitioner looking for the best {h1Primary.toLowerCase()}, 
                our curated catalog ensures you get exactly what you&apos;re searching for. We constantly update our {categoryName.toLowerCase()} category with fresh scenes 
                from premium studios and verified independent creators to ensure high-quality, authentic power exchange and fetish play.
              </p>
              <p>
                Every video is fully tagged, sorted, and optimized for seamless streaming. Explore the finest {categoryName.toLowerCase()} content completely free.
              </p>
            </div>
          </details>
        </section>
      )}
    </div>
  );
}
