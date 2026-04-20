import { Metadata } from "next";
import SearchResultsBrowser from "@/components/SearchResultsBrowser";
import { getPublicSiteSettingsServer } from "@/lib/api";
import { VIDEO_LIST_PAGE_SIZE } from "@/lib/constants";
import { fallbackPublicSiteSettings } from "@/lib/site-settings";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Search Videos",
    description: "Search our collection of BDSM and fetish videos",
  };
}

export default async function SearchPage() {
  const siteSettings = await getPublicSiteSettingsServer().catch(() => fallbackPublicSiteSettings);
  const videosPerPage = siteSettings.content.videos_per_page || VIDEO_LIST_PAGE_SIZE;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <SearchResultsBrowser pageSize={videosPerPage} />
    </div>
  );
}
