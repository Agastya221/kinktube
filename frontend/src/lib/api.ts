import type {
  VideoListResponse,
  Video,
  CategoriesResponse,
  StatsResponse,
  RelatedVideosResponse,
  AffiliateLinksResponse,
  VideoWithAffiliates,
  VideoQueryParams,
  PublicSiteSettings,
  SiteSettings,
  AdminSessionResponse,
  AdminImportStatusResponse,
  AdminSEOGenerateRequest,
  AdminSEOGenerateResponse,
  AISEOStatusResponse,
  AISEOLogsResponse,
  ContactSubmission,
  ContactSubmissionRequest,
  ContactSubmissionsResponse,
} from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const SERVER_API_BASE_URL =
  process.env.API_URL ||
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8080";

// Generic fetch wrapper with error handling
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `API error: ${response.status}`);
  }

  return response.json();
}

async function fetchAdminAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `API error: ${response.status}`);
  }

  return response.json();
}

// Video API functions
export async function getVideos(params: VideoQueryParams = {}): Promise<VideoListResponse> {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set("page", params.page.toString());
  if (params.per_page) searchParams.set("per_page", params.per_page.toString());
  if (params.sort) searchParams.set("sort", params.sort);
  if (params.category) searchParams.set("category", params.category);
  if (params.q) searchParams.set("q", params.q);

  const query = searchParams.toString();
  return fetchAPI<VideoListResponse>(`/api/videos${query ? `?${query}` : ""}`);
}

export async function getVideo(id: string | number): Promise<Video> {
  return fetchAPI<Video>(`/api/videos/${encodeURIComponent(String(id))}`);
}

export async function getRelatedVideos(id: string | number, limit = 12, page = 1): Promise<RelatedVideosResponse> {
  const searchParams = new URLSearchParams({
    limit: String(limit),
    page: String(page),
  });

  return fetchAPI<RelatedVideosResponse>(
    `/api/videos/${encodeURIComponent(String(id))}/related?${searchParams.toString()}`
  );
}

// Category API functions
export async function getCategories(): Promise<CategoriesResponse> {
  return fetchAPI<CategoriesResponse>("/api/categories");
}

// Stats API functions
export async function getStats(): Promise<StatsResponse> {
  return fetchAPI<StatsResponse>("/api/stats");
}

export async function getPublicSiteSettings(): Promise<PublicSiteSettings> {
  return fetchAPI<PublicSiteSettings>("/api/site-settings");
}

// Server-side fetch functions with caching
export async function getVideosServer(params: VideoQueryParams = {}): Promise<VideoListResponse> {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set("page", params.page.toString());
  if (params.per_page) searchParams.set("per_page", params.per_page.toString());
  if (params.sort) searchParams.set("sort", params.sort);
  if (params.category) searchParams.set("category", params.category);
  if (params.q) searchParams.set("q", params.q);

  const query = searchParams.toString();
  const url = `${SERVER_API_BASE_URL}/api/videos${query ? `?${query}` : ""}`;

  const response = await fetch(url, {
    next: { revalidate: 60 }, // Cache for 60 seconds
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

export async function getVideoServer(id: string | number): Promise<Video> {
  const url = `${SERVER_API_BASE_URL}/api/videos/${encodeURIComponent(String(id))}`;

  const response = await fetch(url, {
    next: { revalidate: 300 }, // Cache for 5 minutes
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

export async function getRelatedVideosServer(id: string | number, limit = 12): Promise<RelatedVideosResponse> {
  const url = `${SERVER_API_BASE_URL}/api/videos/${encodeURIComponent(String(id))}/related?limit=${limit}`;

  const response = await fetch(url, {
    next: { revalidate: 300 }, // Cache for 5 minutes
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

export async function getCategoriesServer(): Promise<CategoriesResponse> {
  const url = `${SERVER_API_BASE_URL}/api/categories`;

  const response = await fetch(url, {
    next: { revalidate: 600 }, // Cache for 10 minutes
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

export async function getStatsServer(): Promise<StatsResponse> {
  const url = `${SERVER_API_BASE_URL}/api/stats`;

  const response = await fetch(url, {
    next: { revalidate: 600 }, // Cache for 10 minutes
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

export async function getPublicSiteSettingsServer(): Promise<PublicSiteSettings> {
  const url = `${SERVER_API_BASE_URL}/api/site-settings`;

  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

// Affiliate API functions
export async function getAffiliateLinks(videoId: string | number, max = 2): Promise<AffiliateLinksResponse> {
  return fetchAPI<AffiliateLinksResponse>(`/api/videos/${encodeURIComponent(String(videoId))}/affiliates?max=${max}`);
}

export async function getVideoWithAffiliates(id: string | number): Promise<VideoWithAffiliates> {
  return fetchAPI<VideoWithAffiliates>(`/api/videos/${encodeURIComponent(String(id))}/full`);
}

// Server-side affiliate fetch
export async function getVideoWithAffiliatesServer(id: string | number): Promise<VideoWithAffiliates> {
  const url = `${SERVER_API_BASE_URL}/api/videos/${encodeURIComponent(String(id))}/full`;

  const response = await fetch(url, {
    next: { revalidate: 300 }, // Cache for 5 minutes
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

// Menu category with thumbnail
interface MenuCategory {
  slug: string;
  name: string;
  thumbnail?: string;
}

interface MenuCategoriesResponse {
  categories: MenuCategory[];
}

// Get menu categories with thumbnails in a single request
export async function getMenuCategories(): Promise<Record<string, string>> {
  try {
    const url = `${SERVER_API_BASE_URL}/api/menu-categories`;
    const response = await fetch(url, {
      next: { revalidate: 600 }, // Cache for 10 minutes
    });

    if (!response.ok) {
      return {};
    }

    const data: MenuCategoriesResponse = await response.json();
    const thumbnails: Record<string, string> = {};

    for (const cat of data.categories) {
      if (cat.thumbnail) {
        thumbnails[cat.slug] = cat.thumbnail;
      }
    }

    return thumbnails;
  } catch {
    return {};
  }
}

export async function getAdminSession(): Promise<AdminSessionResponse> {
  return fetchAdminAPI<AdminSessionResponse>("/api/admin/session");
}

export async function loginAdmin(username: string, password: string): Promise<AdminSessionResponse> {
  return fetchAdminAPI<AdminSessionResponse>("/api/admin/session/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function logoutAdmin(): Promise<{ ok: boolean }> {
  return fetchAdminAPI<{ ok: boolean }>("/api/admin/session/logout", {
    method: "POST",
  });
}

export async function getAdminSettings(): Promise<SiteSettings> {
  return fetchAdminAPI<SiteSettings>("/api/admin/settings");
}

export async function updateAdminSettings(settings: SiteSettings): Promise<{ ok: boolean; settings: SiteSettings }> {
  return fetchAdminAPI<{ ok: boolean; settings: SiteSettings }>("/api/admin/settings", {
    method: "PUT",
    body: JSON.stringify(settings),
  });
}

export async function getAdminImportStatus(): Promise<AdminImportStatusResponse> {
  return fetchAdminAPI<AdminImportStatusResponse>("/api/admin/import/status");
}

export async function submitContactMessage(payload: ContactSubmissionRequest): Promise<{ ok: boolean; message: string }> {
  return fetchAPI<{ ok: boolean; message: string }>("/api/contact", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getAdminContactMessages(limit = 100): Promise<ContactSubmissionsResponse> {
  return fetchAdminAPI<ContactSubmissionsResponse>(`/api/admin/messages?limit=${limit}`);
}

export async function updateAdminContactMessageStatus(id: number, status: ContactSubmission["status"]): Promise<{ ok: boolean; message: ContactSubmission }> {
  return fetchAdminAPI<{ ok: boolean; message: ContactSubmission }>(`/api/admin/messages/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function triggerAdminImport(light = false): Promise<{ message: string; status: string }> {
  return fetchAdminAPI<{ message: string; status: string }>(light ? "/api/admin/import/light" : "/api/admin/import", {
    method: "POST",
  });
}

export async function generateAdminSEO(payload: AdminSEOGenerateRequest): Promise<AdminSEOGenerateResponse> {
  return fetchAdminAPI<AdminSEOGenerateResponse>("/api/admin/seo/generate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getAISEOStatus(): Promise<AISEOStatusResponse> {
  return fetchAdminAPI<AISEOStatusResponse>("/api/admin/ai-seo/status");
}

export async function getAISEOLogs(status = "", page = 1, perPage = 50): Promise<AISEOLogsResponse> {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  params.set("page", String(page));
  params.set("per_page", String(perPage));
  return fetchAdminAPI<AISEOLogsResponse>(`/api/admin/ai-seo/logs?${params.toString()}`);
}

export async function startSEOBackfill(): Promise<{ ok: boolean; message: string }> {
  return fetchAdminAPI<{ ok: boolean; message: string }>("/api/admin/seo/backfill/start", {
    method: "POST",
  });
}

export async function stopSEOBackfill(): Promise<{ ok: boolean; message: string }> {
  return fetchAdminAPI<{ ok: boolean; message: string }>("/api/admin/seo/backfill/stop", {
    method: "POST",
  });
}

export async function resetSEOBackfill(timeframe: "today" | "all"): Promise<{ ok: boolean; message: string; count: number }> {
  return fetchAdminAPI<{ ok: boolean; message: string; count: number }>("/api/admin/seo/backfill/reset", {
    method: "POST",
    body: JSON.stringify({ timeframe }),
  });
}

export async function triggerAdminDBCleanup(): Promise<{ message: string; status: string }> {
  return fetchAdminAPI<{ message: string; status: string }>("/api/admin/cleanup", {
    method: "POST",
  });
}

