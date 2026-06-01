import type { Video } from "./types";
import { normalizePublicApiBaseUrl } from "./url";

const PUBLIC_API_BASE_URL = normalizePublicApiBaseUrl(process.env.NEXT_PUBLIC_API_URL);
const PLACEHOLDER_THUMBNAIL = "/placeholder-video.svg";

function isEpornerHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  return host === "eporner.com" || host.endsWith(".eporner.com");
}

export function getDisplayThumbnailUrl(rawUrl?: string | null): string {
  if (!rawUrl) {
    return PLACEHOLDER_THUMBNAIL;
  }

  if (rawUrl.startsWith("/") || rawUrl.startsWith("data:") || rawUrl.startsWith("blob:")) {
    return rawUrl;
  }

  try {
    const url = new URL(rawUrl);
    if (url.protocol === "https:" && isEpornerHost(url.hostname)) {
      return `${PUBLIC_API_BASE_URL}/api/media/thumbnail?url=${encodeURIComponent(url.toString())}`;
    }
  } catch {
    return rawUrl;
  }

  return rawUrl;
}

export function getBestDisplayThumbnailUrl(video: Pick<Video, "thumbnail" | "thumbnail_lg">): string {
  return getDisplayThumbnailUrl(video.thumbnail_lg || video.thumbnail);
}
