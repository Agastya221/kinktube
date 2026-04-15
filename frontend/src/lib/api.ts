import type {
  VideoListResponse,
  Video,
  CategoriesResponse,
  StatsResponse,
  RelatedVideosResponse,
  AffiliateLinksResponse,
  VideoWithAffiliates,
  VideoQueryParams,
} from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

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

export async function getVideo(id: number): Promise<Video> {
  return fetchAPI<Video>(`/api/videos/${id}`);
}

export async function getRelatedVideos(id: number, limit = 12): Promise<RelatedVideosResponse> {
  return fetchAPI<RelatedVideosResponse>(`/api/videos/${id}/related?limit=${limit}`);
}

// Category API functions
export async function getCategories(): Promise<CategoriesResponse> {
  return fetchAPI<CategoriesResponse>("/api/categories");
}

// Stats API functions
export async function getStats(): Promise<StatsResponse> {
  return fetchAPI<StatsResponse>("/api/stats");
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
  const url = `${API_BASE_URL}/api/videos${query ? `?${query}` : ""}`;

  const response = await fetch(url, {
    next: { revalidate: 60 }, // Cache for 60 seconds
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

export async function getVideoServer(id: number): Promise<Video> {
  const url = `${API_BASE_URL}/api/videos/${id}`;

  const response = await fetch(url, {
    next: { revalidate: 300 }, // Cache for 5 minutes
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

export async function getRelatedVideosServer(id: number, limit = 12): Promise<RelatedVideosResponse> {
  const url = `${API_BASE_URL}/api/videos/${id}/related?limit=${limit}`;

  const response = await fetch(url, {
    next: { revalidate: 300 }, // Cache for 5 minutes
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

export async function getCategoriesServer(): Promise<CategoriesResponse> {
  const url = `${API_BASE_URL}/api/categories`;

  const response = await fetch(url, {
    next: { revalidate: 600 }, // Cache for 10 minutes
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

// Affiliate API functions
export async function getAffiliateLinks(videoId: number, max = 2): Promise<AffiliateLinksResponse> {
  return fetchAPI<AffiliateLinksResponse>(`/api/videos/${videoId}/affiliates?max=${max}`);
}

export async function getVideoWithAffiliates(id: number): Promise<VideoWithAffiliates> {
  return fetchAPI<VideoWithAffiliates>(`/api/videos/${id}/full`);
}

// Server-side affiliate fetch
export async function getVideoWithAffiliatesServer(id: number): Promise<VideoWithAffiliates> {
  const url = `${API_BASE_URL}/api/videos/${id}/full`;

  const response = await fetch(url, {
    next: { revalidate: 300 }, // Cache for 5 minutes
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

// Get top video thumbnail for a category (for category images)
export async function getCategoryThumbnail(category: string): Promise<string | null> {
  try {
    const data = await getVideosServer({
      category,
      sort: "rating",
      per_page: 1,
      page: 1,
    });

    if (data.videos && data.videos.length > 0) {
      return data.videos[0].thumbnail_lg || data.videos[0].thumbnail;
    }
    return null;
  } catch {
    return null;
  }
}

// Get thumbnails for multiple categories
export async function getCategoryThumbnails(categories: string[]): Promise<Record<string, string>> {
  const thumbnails: Record<string, string> = {};

  // Fetch in parallel with a small batch to avoid overwhelming the API
  const results = await Promise.allSettled(
    categories.map(async (cat) => {
      const thumb = await getCategoryThumbnail(cat);
      return { category: cat, thumbnail: thumb };
    })
  );

  for (const result of results) {
    if (result.status === "fulfilled" && result.value.thumbnail) {
      thumbnails[result.value.category] = result.value.thumbnail;
    }
  }

  return thumbnails;
}
