const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

function shouldUseHttpsForPublicUrl(): boolean {
  if (typeof window !== "undefined") {
    return window.location.protocol === "https:";
  }

  return process.env.NODE_ENV === "production";
}

export function normalizePublicApiBaseUrl(rawUrl?: string): string {
  const fallback = "http://localhost:8080";
  const trimmed = (rawUrl || fallback).trim().replace(/\/+$/, "");

  try {
    const url = new URL(trimmed);

    if (shouldUseHttpsForPublicUrl() && url.protocol === "http:" && !LOCAL_HOSTS.has(url.hostname)) {
      url.protocol = "https:";
    }

    return url.toString().replace(/\/+$/, "");
  } catch {
    return trimmed;
  }
}
