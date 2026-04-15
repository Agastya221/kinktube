import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Eye, Clock, Star, Tag, Calendar } from "lucide-react";
import VideoPlayer from "@/components/VideoPlayer";
import VideoGrid from "@/components/VideoGrid";
import { AffiliateButtons } from "@/components/affiliate";
import { AdBanner, SidebarAds } from "@/components/ads";
import { getVideoWithAffiliatesServer, getRelatedVideosServer } from "@/lib/api";
import { formatViews, formatDuration, formatRelativeTime, getVideoPath } from "@/lib/types";

interface VideoPageProps {
  params: Promise<{
    id: string;
  }>;
}

// Generate dynamic SEO metadata
export async function generateMetadata({ params }: VideoPageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const { video } = await getVideoWithAffiliatesServer(id);

    // Build SEO-optimized title and description with BDSM keywords
    const seoTitle = `${video.title} - Free BDSM Video`;
    const seoDescription = video.description
      ? `${video.description.slice(0, 150)}... Watch this ${video.duration_str} BDSM video free.`
      : `Watch ${video.title} - ${video.duration_str} free BDSM and fetish video. ${video.categories.join(", ")} content.`;

    // Keywords from tags and categories
    const keywords = [
      ...video.categories,
      ...video.tags.slice(0, 10),
      "BDSM",
      "fetish",
      "bondage",
      "free video",
    ].join(", ");

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
            url: video.thumbnail_lg || video.thumbnail,
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
        images: [video.thumbnail_lg || video.thumbnail],
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

// Generate JSON-LD structured data for SEO
function generateVideoSchema(video: {
  id: number;
  title: string;
  description?: string;
  thumbnail_lg: string;
  thumbnail: string;
  duration: number;
  embed_url: string;
  added_at: string;
  views: number;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: video.title,
    description: video.description || video.title,
    thumbnailUrl: video.thumbnail_lg || video.thumbnail,
    duration: `PT${Math.floor(video.duration / 60)}M${video.duration % 60}S`,
    embedUrl: video.embed_url,
    uploadDate: video.added_at,
    interactionStatistic: {
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/WatchAction",
      userInteractionCount: video.views,
    },
    isFamilyFriendly: false,
    contentRating: "Adult",
  };
}

export default async function VideoPage({ params }: VideoPageProps) {
  const { id } = await params;

  let videoData;
  let relatedVideos;

  try {
    [videoData, relatedVideos] = await Promise.all([
      getVideoWithAffiliatesServer(id),
      getRelatedVideosServer(id, 12),
    ]);
  } catch {
    notFound();
  }

  const { video, affiliate_links } = videoData;

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateVideoSchema(video)),
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Top Ad Banner */}
        <div className="mb-6 hidden md:block">
          <AdBanner position="top" />
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Main Video Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Video Player */}
            <div className="rounded-xl overflow-hidden shadow-2xl shadow-black/50">
              <VideoPlayer
                embedUrl={video.embed_url}
                title={video.title}
                thumbnailUrl={video.thumbnail_lg || video.thumbnail}
              />
            </div>

            {/* Affiliate Buttons - Primary CTA */}
            <AffiliateButtons
              links={affiliate_links}
              videoTitle={video.title}
              className="bg-background-secondary rounded-xl p-4 sm:p-6 border border-border"
            />

            {/* Video Info Card */}
            <div className="bg-background-secondary rounded-xl p-4 sm:p-6 border border-border">
              {/* Title */}
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
                  <p className="text-foreground-muted leading-relaxed">
                    {video.description}
                  </p>
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
                      <Link
                        key={cat}
                        href={`/category/${cat}`}
                        className="category-pill"
                      >
                        {cat.charAt(0).toUpperCase() + cat.slice(1).replace("-", " ")}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {video.tags && video.tags.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-sm font-semibold text-foreground-muted mb-3">
                    Tags
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {video.tags.slice(0, 20).map((tag) => (
                      <Link
                        key={tag}
                        href={`/search?q=${encodeURIComponent(tag)}`}
                        className="px-2.5 py-1 bg-background-tertiary text-foreground-muted rounded-md text-sm hover:text-accent hover:bg-accent/10 transition-colors"
                      >
                        #{tag}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Ad Banner Below Video Info */}
            <div className="hidden md:block">
              <AdBanner position="video" />
            </div>

            {/* Mobile Ad */}
            <div className="md:hidden">
              <AdBanner position="mobile" />
            </div>
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-1 space-y-6">
            {/* Sidebar Ads */}
            <div className="hidden lg:block">
              <SidebarAds count={1} />
            </div>

            {/* Related Videos - Sidebar Version */}
            <div className="bg-background-secondary rounded-xl p-4 border border-border">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="w-1 h-6 bg-accent rounded-full" />
                Related Videos
              </h2>

              {relatedVideos.videos && relatedVideos.videos.length > 0 ? (
                <div className="space-y-4">
                  {relatedVideos.videos.slice(0, 6).map((relatedVideo) => (
                    <Link
                      key={relatedVideo.external_id || relatedVideo.id}
                      href={getVideoPath(relatedVideo)}
                      className="flex gap-3 group"
                    >
                      <div className="relative w-28 sm:w-36 flex-shrink-0">
                        <div className="thumbnail-container">
                          <Image
                            src={relatedVideo.thumbnail}
                            alt={relatedVideo.title}
                            fill
                            sizes="144px"
                            className="object-cover rounded-lg"
                            loading="lazy"
                          />
                          <span className="duration-badge">
                            {relatedVideo.duration_str || formatDuration(relatedVideo.duration)}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 py-1">
                        <h3 className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-accent transition-colors">
                          {relatedVideo.title}
                        </h3>
                        <p className="text-xs text-foreground-muted mt-1.5">
                          {formatViews(relatedVideo.views)} views
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-foreground-muted text-sm">No related videos found</p>
              )}
            </div>

            {/* Second Sidebar Ad */}
            <div className="hidden lg:block">
              <SidebarAds count={1} />
            </div>
          </aside>
        </div>

        {/* More Related Videos - Full Width Grid */}
        {relatedVideos.videos && relatedVideos.videos.length > 6 && (
          <section className="mt-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <span className="w-1.5 h-8 bg-accent rounded-full" />
              More Videos Like This
            </h2>
            <VideoGrid videos={relatedVideos.videos.slice(6)} />
          </section>
        )}

        {/* Bottom Ad Banner */}
        <div className="mt-8 hidden md:block">
          <AdBanner position="bottom" />
        </div>
      </div>
    </>
  );
}
