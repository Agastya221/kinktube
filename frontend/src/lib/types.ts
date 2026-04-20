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
  has_more: boolean;
  total_exact: boolean;
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

export interface BrandingSettings {
  site_name: string;
  logo_primary: string;
  logo_secondary: string;
  site_tagline: string;
  hero_accent: string;
  hero_title: string;
  hero_description: string;
  footer_description: string;
  copyright_label: string;
}

export interface ThemeSettings {
  background: string;
  background_secondary: string;
  background_tertiary: string;
  foreground: string;
  foreground_muted: string;
  accent: string;
  accent_hover: string;
  accent_light: string;
  border: string;
  border_hover: string;
}

export interface SEOSettings {
  site_url: string;
  default_title: string;
  title_template: string;
  default_description: string;
  default_keywords: string[];
  open_graph_title: string;
  open_graph_description: string;
  twitter_title: string;
  twitter_description: string;
}

export interface ContentSettings {
  videos_per_page: number;
  related_videos: number;
  show_disclaimer: boolean;
  disclaimer_text: string;
  enable_age_gate: boolean;
  enable_popunder_ads: boolean;
}

export interface AdSlotSettings {
  enabled: boolean;
  zone_id: string;
  label: string;
}

export interface AdSettings {
  network: "exoclick" | "trafficjunky" | "juicyads" | "custom";
  banner: AdSlotSettings;
  sidebar: AdSlotSettings;
  native: AdSlotSettings;
  popunder: AdSlotSettings;
  video_banner: AdSlotSettings;
  mobile_banner: AdSlotSettings;
}

export interface AffiliateSettings {
  kinkydollars_id: string;
  clubdomcash_id: string;
  femdomempire_id: string;
  devicebondage_id: string;
  hogtied_id: string;
  whippedass_id: string;
  sadisticrope_id: string;
  default_id: string;
}

export interface LegalDocumentSettings {
  title: string;
  content: string;
}

export interface LegalSettings {
  terms: LegalDocumentSettings;
  privacy: LegalDocumentSettings;
  dmca: LegalDocumentSettings;
  compliance_2257: LegalDocumentSettings;
}

export interface ImportSettings {
  import_enabled: boolean;
  import_max_pages: number;
  light_import_max_pages: number;
  light_import_keywords: number;
}

export interface SiteSettings {
  branding: BrandingSettings;
  theme: ThemeSettings;
  seo: SEOSettings;
  content: ContentSettings;
  ads: AdSettings;
  affiliates: AffiliateSettings;
  legal: LegalSettings;
  import: ImportSettings;
}

export interface PublicSiteSettings {
  branding: BrandingSettings;
  theme: ThemeSettings;
  seo: SEOSettings;
  content: ContentSettings;
  ads: AdSettings;
  legal: LegalSettings;
}

export interface AdminSessionResponse {
  authenticated: boolean;
  username: string;
}

export interface AdminImportStatusResponse {
  running: boolean;
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
