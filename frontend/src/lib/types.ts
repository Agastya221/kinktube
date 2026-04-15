// Video represents a video entry from the API
export interface Video {
  id: number;
  external_id: string;
  title: string;
  description?: string;
  duration: number;
  duration_str: string;
  views: number;
  rating: number;
  thumbnail: string;
  thumbnail_lg: string;
  embed_url: string;
  source_url: string;
  tags: string[];
  categories: string[];
  keywords: string;
  added_at: string;
  published_at: string;
  last_updated_at: string;
}

// VideoListResponse is the paginated response from the API
export interface VideoListResponse {
  videos: Video[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Category represents a video category
export interface Category {
  slug: string;
  name: string;
  description?: string;
  video_count: number;
}

// CategoriesResponse is the API response for categories
export interface CategoriesResponse {
  categories: Category[];
}

// StatsResponse is the API response for stats
export interface StatsResponse {
  total_videos: number;
}

// RelatedVideosResponse is the API response for related videos
export interface RelatedVideosResponse {
  videos: Video[];
}

// AffiliateLink represents an affiliate link from the API
export interface AffiliateLink {
  program: string;
  display_name: string;
  url: string;
  description: string;
  cta: string;
  logo_url?: string;
  is_primary: boolean;
}

// AffiliateLinksResponse is the API response for affiliate links
export interface AffiliateLinksResponse {
  links: AffiliateLink[];
}

// VideoWithAffiliates is the full video response with affiliate links
export interface VideoWithAffiliates {
  video: Video;
  affiliate_links: AffiliateLink[];
}

// API query parameters
export interface VideoQueryParams {
  page?: number;
  per_page?: number;
  sort?: "latest" | "views" | "rating" | "duration" | "oldest" | "extreme";
  category?: string;
  q?: string;
}

export function getVideoIdentifier(video: Pick<Video, "external_id" | "id">): string {
  return video.external_id || video.id.toString();
}

export function getVideoPath(video: Pick<Video, "external_id" | "id">): string {
  return `/video/${encodeURIComponent(getVideoIdentifier(video))}`;
}

// Format view count to human readable
export function formatViews(views: number): string {
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M`;
  }
  if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}K`;
  }
  return views.toString();
}

// Format duration seconds to human readable
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

// Format date to relative time
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Today";
  }
  if (diffDays === 1) {
    return "Yesterday";
  }
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months > 1 ? "s" : ""} ago`;
  }
  const years = Math.floor(diffDays / 365);
  return `${years} year${years > 1 ? "s" : ""} ago`;
}
