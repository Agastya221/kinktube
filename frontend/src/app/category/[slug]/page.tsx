import { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import VideoGrid from "@/components/VideoGrid";
import CategoryNav from "@/components/CategoryNav";
import Pagination from "@/components/Pagination";
import { AdBanner } from "@/components/ads";
import { SortSelect } from "@/components/SortSelect";
import { getVideosServer, getCategoriesServer, getPublicSiteSettingsServer } from "@/lib/api";
import { VIDEO_LIST_PAGE_SIZE } from "@/lib/constants";
import { defaultCategories } from "@/lib/default-categories";
import { fallbackPublicSiteSettings } from "@/lib/site-settings";
import { getVideoPath, type Video } from "@/lib/types";

// ISR: serve from edge cache, regenerate every 60 seconds
export const revalidate = 60;

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  "https://kinktube.fun"
).replace(/\/+$/, "");

interface CategoryPageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    page?: string;
    sort?: string;
  }>;
}

// Category metadata for SEO - covers every category slug in the backend
const categoryMeta: Record<string, { title: string; description: string }> = {
  // ── Core dynamics ────────────────────────────────────────────────────────────
  bdsm: {
    title: "BDSM Videos - Bondage, Domination & Fetish Porn",
    description:
      "Explore the ultimate collection of free BDSM videos, featuring high-quality bondage, domination, submission, sadism, and masochism scenes. Our library is curated for true fetish enthusiasts, offering everything from light power exchange to hardcore dungeon sessions. Updated daily with the best BDSM content from top studios and independent creators.",
  },
  femdom: {
    title: "Femdom Videos - Female Domination & Dominatrix Porn",
    description:
      "Watch powerful mistresses and strict dominatrices take full control in our massive library of free femdom videos. From psychological humiliation and financial domination to intense physical discipline and strap-on play, experience the best in female-led BDSM. Whether you crave a cruel mistress or a nurturing domme, our femdom category delivers high-quality scenes for every submissive desire.",
  },
  bondage: {
    title: "Bondage Videos - Rope Bondage, Restraints & Tie-Up Porn",
    description:
      "Experience the art of restraint with our extensive collection of free bondage videos. Featuring intricate rope bondage, heavy metal restraints, handcuffs, and inescapable tie-up scenes, our content focuses on the thrill of being bound. Discover everything from beginner-friendly restraints to extreme predicament bondage and suspension, all available in high definition.",
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
      "Immerse yourself in the beautiful art of Shibari and Kinbaku. Our free Shibari videos showcase the perfect blend of aesthetic rope art and intense BDSM suspension. Watch master riggers create complex patterns and inescapable ties that focus on both physical restraint and psychological connection. The finest Japanese rope bondage collection updated daily for connoisseurs.",
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
      "Shiny, tight, and inescapable our free latex fetish videos feature the best in rubber and PVC BDSM play. Watch dominant mistresses in full-body latex catsuits, vacuum bed sessions, and heavy rubber enclosure scenes. From polished medical latex to rough rubber discipline, we celebrate the unique sensations of latex kink in every video.",
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

const bdsmPillarLinks = [
  { href: "/bdsm-meaning", label: "BDSM Meaning" },
  { href: "/bdsm-test", label: "BDSM Test" },
  { href: "/category/bondage", label: "Bondage" },
  { href: "/category/femdom", label: "Femdom" },
  { href: "/category/dominatrix", label: "Dominatrix" },
  { href: "/category/submission", label: "Submission" },
  { href: "/category/slave", label: "Slave Training" },
  { href: "/category/extreme-bondage", label: "Extreme Bondage" },
  { href: "/category/spanking", label: "Spanking" },
];

const categoryNameOverrides: Record<string, string> = {
  bdsm: "BDSM",
  cbt: "CBT",
};

function formatCategoryName(slug: string): string {
  return slug
    .split("-")
    .map((word) => categoryNameOverrides[word] || word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getCategoryMeta(slug: string, categoryName: string) {
  return categoryMeta[slug] || {
    title: `${categoryName} Videos - Free BDSM Porn & Fetish Tube`,
    description: `Browse the best ${categoryName} porn videos. High quality BDSM and fetish tube content curated for enthusiasts.`,
  };
}

function getCategoryBaseTitle(categoryName: string): string {
  return `Free ${categoryName} Porn Videos - BDSM Tube`;
}

function getCanonicalPath(slug: string, page: number, hasSort: boolean): string {
  if (hasSort) return `/category/${slug}`;
  return page > 1 ? `/category/${slug}?page=${page}` : `/category/${slug}`;
}

function generateCategoryStructuredData({
  slug,
  categoryName,
  title,
  description,
  videos,
}: {
  slug: string;
  categoryName: string;
  title: string;
  description: string;
  videos: Video[];
}) {
  const categoryUrl = `${SITE_URL}/category/${slug}`;

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": SITE_URL,
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": categoryName,
        "item": categoryUrl,
      },
    ],
  };

  const collectionPage = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${categoryUrl}#collection`,
    "url": categoryUrl,
    "name": title,
    "description": description,
    "isFamilyFriendly": false,
    "contentRating": "Adult Only",
    "inLanguage": "en",
    "about": ["BDSM", categoryName, "fetish videos", "adult videos"],
  };

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": `${categoryName} videos on KinkTube`,
    "itemListOrder": "https://schema.org/ItemListOrderDescending",
    "numberOfItems": videos.length,
    "itemListElement": videos.map((video, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "url": `${SITE_URL}${getVideoPath(video)}`,
      "name": video.title,
    })),
  };

  return [breadcrumb, collectionPage, itemList];
}

export async function generateMetadata({ params, searchParams }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const search = await searchParams;
  const page = parseInt(search?.page || "1", 10);
  const hasSort = Boolean(search?.sort);
  const categoryName = formatCategoryName(slug);
  const meta = getCategoryMeta(slug, categoryName);
  const baseTitle = getCategoryBaseTitle(categoryName);
  const title = page > 1 ? `${baseTitle} - Page ${page}` : baseTitle;
  const canonical = getCanonicalPath(slug, page, hasSort);
  const shouldNoindex = hasSort || page > 5;

  return {
    title,
    description: meta.description,
    keywords: [slug, categoryName, "BDSM", "fetish", "videos", "free"].join(", "),
    robots: shouldNoindex ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      title: `${title} | KinkTube`,
      description: meta.description,
    },
    alternates: {
      canonical,
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

  const categoryName = formatCategoryName(slug);

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

  const meta = getCategoryMeta(slug, categoryName);
  const currentCategory = categories.categories.find((category) => category.slug === slug);

  const baseTitle = getCategoryBaseTitle(categoryName);
  const h1Parts = baseTitle.split(" - ");
  const h1Primary = h1Parts[0];
  const h1Secondary = h1Parts.length > 1 ? ` - ${h1Parts[1]}` : "";
  const structuredData = generateCategoryStructuredData({
    slug,
    categoryName,
    title: baseTitle,
    description: meta.description,
    videos: videosData.videos,
  });

  return (
    <>
      {structuredData.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

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

      <section className="mb-4 md:mb-8">
        <h1 className="text-xl sm:text-3xl md:text-4xl font-bold mb-2 leading-tight">
          <span className="text-accent">{h1Primary}</span>
          <span className="text-foreground-muted/80 font-medium text-lg sm:text-2xl md:text-3xl">{h1Secondary}</span>
        </h1>
        <div className="space-y-2 max-w-3xl">
          <p className="text-sm sm:text-base text-foreground-muted leading-relaxed">{meta.description}</p>
          {currentCategory && currentCategory.video_count > 0 && (
            <p className="text-xs sm:text-sm font-medium uppercase tracking-[0.14em] text-accent/80">
              {currentCategory.video_count.toLocaleString()} indexed videos in this category
            </p>
          )}
        </div>
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

        <section className="mt-10 md:mt-12 border-t border-border pt-6 md:pt-8">
          {slug === "bdsm" ? (
            <div className="max-w-4xl text-foreground-muted text-sm sm:text-base leading-relaxed space-y-6">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-3">
                  What you&apos;ll find in this BDSM tube category
                </h2>
                <p>
                  This BDSM tube category is the main hub for free BDSM videos on KinkTube. It brings
                  together bondage, domination, submission, discipline, dungeon scenes, fetish gear,
                  power exchange, and harder kink clips in one canonical place. If a searcher is
                  looking for BDSM porn, BDSM videos, or a broad BDSM tube page rather than one narrow
                  sub-genre, this is the page that should answer that intent.
                </p>
                <p className="mt-3">
                  The goal is simple: make the page useful before the grid starts and useful after the
                  grid ends. Visitors can browse the newest clips, sort by views or rating, then move
                  into tighter categories when they know what style they want. Google gets the same
                  clear structure: one central BDSM category supported by specialist pages.
                </p>
              </div>

              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-3">
                  Popular BDSM video types
                </h2>
                <p>
                  The collection covers restraint-focused scenes, female-led domination, obedient
                  submissive training, strict punishment, impact play, leather and latex fetish
                  aesthetics, and intense bondage variations. Some viewers want quick free BDSM porn
                  clips, while others want a deeper BDSM video catalog with related tags, category
                  links, thumbnails, durations, and fresh updates. This page is built for both paths.
                </p>
                <p className="mt-3">
                  Use the related categories below when you want a tighter focus. Bondage is best for
                  rope, restraints, and tie-up scenes. Femdom and Dominatrix focus on female control.
                  Submission and Slave Training cover obedience dynamics. Extreme Bondage and Spanking
                  help users move into more specific BDSM kink styles without leaving the site.
                </p>
              </div>

              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-3">
                  Related BDSM guides and categories
                </h2>
                <div className="flex flex-wrap gap-2">
                  {bdsmPillarLinks.map((link) => (
                    <Link key={link.href} href={link.href} className="category-pill">
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl text-foreground-muted text-sm sm:text-base leading-relaxed space-y-3">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">
                Watch {h1Primary} &amp; Discover More
              </h2>
              <p>
                {meta.description} Welcome to a focused library of <strong>{categoryName.toLowerCase()} videos</strong>{" "}
                inside the wider KinkTube BDSM catalog.
              </p>
              <p>
                Every category page is connected to related BDSM, bondage, femdom, fetish, and kink
                videos so visitors can move from broad discovery into the exact style they want.
              </p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
