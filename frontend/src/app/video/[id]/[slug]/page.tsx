import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Eye, Clock, Star, Tag, Calendar } from "lucide-react";
import VideoPlayer from "@/components/VideoPlayer";
import Comments from "@/components/Comments";
import PaginatedRelatedVideos from "@/components/PaginatedRelatedVideos";
import SidebarRelatedVideos from "@/components/SidebarRelatedVideos";
import { AffiliateButtons } from "@/components/affiliate";
import { AdBanner, BetweenContentAd } from "@/components/ads";
import { getVideoWithAffiliatesServer, getRelatedVideosServer } from "@/lib/api";
import { getBestDisplayThumbnailUrl } from "@/lib/media";
import { formatViews, formatDuration, formatRelativeTime, getVideoPath, slugify } from "@/lib/types";

// ISR: regenerate every 5 minutes for fresh data with fast TTFB
export const revalidate = 300;

interface VideoPageProps {
  params: Promise<{
    id: string;
    slug: string;
  }>;
}

const VIDEO_PAGE_RELATED_LIMIT = 24;

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  "https://kinktube.fun"
).replace(/\/+$/, "");

const getCachedVideoWithAffiliates = cache((id: string) => getVideoWithAffiliatesServer(id));
const getCachedRelatedVideos = cache((id: string, limit: number) => getRelatedVideosServer(id, limit));

// Generate dynamic SEO metadata
export async function generateMetadata({ params }: VideoPageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const { video } = await getCachedVideoWithAffiliates(id);

    const primaryCategory = video.categories?.[0] ?? "bdsm";
    const categoryLabel = primaryCategory
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    const seoTitle = `${video.title} - Free BDSM Porn Video | Extreme Bondage & Fetish`;

    const topTags = video.tags.slice(0, 4).join(", ");
    const seoDescription = video.description
      ? `${video.description.slice(0, 140)}... Watch free adult ${categoryLabel} videos on KinkTube.`
      : `Watch ${video.title} - a ${video.duration_str} free adult ${categoryLabel} video on KinkTube. Features: ${topTags}. New kink and BDSM content added daily.`;

    const keywords = [
      ...video.categories,
      ...video.tags.slice(0, 10),
      "adult BDSM",
      "fetish video",
      "bondage video",
      "kink catalog",
    ]
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 15)
      .join(", ");

    const displayThumbnailUrl = getBestDisplayThumbnailUrl(video);

    return {
      title: seoTitle,
      description: seoDescription,
      keywords,
      openGraph: {
        title: seoTitle,
        description: seoDescription,
        type: "video.other",
        images: [
          {
            url: displayThumbnailUrl,
            width: 640,
            height: 360,
            alt: video.title,
          },
        ],
        videos: [
          {
            url: video.embed_url,
            width: 640,
            height: 360,
            type: "text/html",
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: seoTitle,
        description: seoDescription,
        images: [displayThumbnailUrl],
      },
      robots: {
        index: true,
        follow: true,
      },
      alternates: {
        canonical: getVideoPath(video),
      },
    };
  } catch {
    return { title: "Video Not Found" };
  }
}

// Generate JSON-LD VideoObject + BreadcrumbList structured data
function generateStructuredData(video: {
  id: number;
  title: string;
  description?: string;
  thumbnail_lg: string;
  thumbnail: string;
  duration: number;
  embed_url: string;
  added_at: string;
  views: number;
  categories?: string[];
}) {
  const primaryCategory = (video.categories?.[0] ?? "bdsm")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const videoObject = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: video.title,
    description: video.description || `Free adult ${primaryCategory} porn video on KinkTube. ${video.title}.`,
    thumbnailUrl: getBestDisplayThumbnailUrl(video),
    duration: `PT${Math.floor(video.duration / 60)}M${video.duration % 60}S`,
    embedUrl: video.embed_url,
    uploadDate: new Date(video.added_at).toISOString(),
    interactionStatistic: {
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/WatchAction",
      userInteractionCount: video.views,
    },
    isFamilyFriendly: false,
    contentRating: "Adult",
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL,
      },
      ...(video.categories?.[0]
        ? [
            {
              "@type": "ListItem",
              position: 2,
              name: primaryCategory,
              item: `${SITE_URL}/category/${video.categories[0]}`,
            },
          ]
        : []),
      {
        "@type": "ListItem",
        position: video.categories?.[0] ? 3 : 2,
        name: video.title,
      },
    ],
  };

  return [videoObject, breadcrumb];
}

export default async function VideoSlugPage({ params }: VideoPageProps) {
  const { id } = await params;

  let videoData;
  let relatedVideos;

  try {
    [videoData, relatedVideos] = await Promise.all([
      getCachedVideoWithAffiliates(id),
      getCachedRelatedVideos(id, VIDEO_PAGE_RELATED_LIMIT).catch(() => ({ videos: [] })),
    ]);
  } catch {
    notFound();
  }

  const { video, affiliate_links } = videoData;
  const allRelatedVideos = relatedVideos.videos || [];

  return (
    <>
      {/* JSON-LD Structured Data: VideoObject + BreadcrumbList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateStructuredData(video)),
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Top Ad Banner - Desktop Only */}
        <div className="mb-6 hidden md:flex justify-center">
          <AdBanner position="top" />
        </div>

        {/* Main Content Layout: Video + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 lg:gap-8">
          {/* Main Video Section */}
          <div className="min-w-0 space-y-6">
            {/* Video Player */}
            <div className="rounded-xl overflow-hidden shadow-2xl shadow-black/50">
              <VideoPlayer
                embedUrl={video.embed_url}
                title={video.title}
              />
            </div>

            {/* Mobile Ad Below Player */}
            <div className="flex justify-center py-3 md:hidden">
              <AdBanner position="mobile" />
            </div>

            {/* Affiliate Buttons */}
            <AffiliateButtons
              links={affiliate_links}
              videoTitle={video.title}
              className="bg-background-secondary rounded-xl p-4 sm:p-6 border border-border"
            />

            {/* Video Info Card */}
            <div className="bg-background-secondary rounded-xl p-4 sm:p-6 border border-border">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-4 leading-tight">
                {video.title}
              </h1>

              {/* Stats Row */}
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-foreground-muted mb-6">
                <span className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  <span className="font-medium">{formatViews(video.views)}</span>
                  <span className="text-sm">views</span>
                </span>
                <span className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  <span className="font-medium">
                    {video.duration_str || formatDuration(video.duration)}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  <span className="font-medium">{video.rating.toFixed(1)}</span>
                </span>
                <span className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  <span className="text-sm">{formatRelativeTime(video.added_at)}</span>
                </span>
              </div>

              {/* Description */}
              {video.description && (
                <div className="mb-6">
                  <p className="text-foreground-muted leading-relaxed">{video.description}</p>
                </div>
              )}

              {/* Categories */}
              {video.categories && video.categories.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-sm font-semibold text-foreground-muted mb-3 flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Categories
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {video.categories.map((cat) => (
                      <Link key={cat} href={`/category/${cat}`} className="category-pill">
                        {cat.charAt(0).toUpperCase() + cat.slice(1).replace("-", " ")}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {video.tags && video.tags.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-sm font-semibold text-foreground-muted mb-3">Tags</h2>
                  <div className="flex flex-wrap gap-2">
                    {video.tags.slice(0, 20).map((tag) => (
                      <Link
                        key={tag}
                        href={`/tag/${slugify(tag)}`}
                        className="px-2.5 py-1 bg-background-tertiary text-foreground-muted rounded-md text-sm hover:text-accent hover:bg-accent/10 transition-colors"
                      >
                        #{tag}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Between-Content Ad */}
            <div className="flex justify-center">
              <BetweenContentAd />
            </div>

            {/* Comments Section */}
            <Comments videoId={video.id} />
          </div>

          {/* Desktop Sidebar — Related Videos + Native Ad */}
          <aside className="hidden lg:block">
            <SidebarRelatedVideos videos={allRelatedVideos} />
          </aside>
        </div>

        {/* Related Videos — Full Width Below */}
        {allRelatedVideos.length > 0 && (
          <PaginatedRelatedVideos videoId={video.id} initialVideos={allRelatedVideos} />
        )}

        {/* Bottom Ad - Desktop Only */}
        <div className="mt-8 hidden md:flex justify-center">
          <AdBanner position="bottom" />
        </div>
      </div>
    </>
  );
}
