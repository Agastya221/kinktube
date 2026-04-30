import { redirect } from "next/navigation";
import { getVideoWithAffiliatesServer } from "@/lib/api";
import { getVideoPath } from "@/lib/types";

/**
 * Legacy route handler for /video/[id] (without slug).
 *
 * This performs a 301 permanent redirect to the canonical /video/[id]/[slug] URL.
 * This ensures:
 *  - Old links, bookmarks, and search engine indexes still work
 *  - Google transfers link equity via the 301 to the new canonical URL
 *  - No duplicate content issues between /video/123 and /video/123/some-title
 */

interface LegacyVideoPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function LegacyVideoRedirect({ params }: LegacyVideoPageProps) {
  const { id } = await params;

  try {
    const { video } = await getVideoWithAffiliatesServer(id);
    const canonicalPath = getVideoPath(video);
    redirect(canonicalPath);
  } catch {
    // If the video doesn't exist, redirect to the slug page which will 404 properly
    redirect(`/video/${encodeURIComponent(id)}/video`);
  }
}
