import Header from "./Header";
import { getMenuCategories } from "@/lib/api";

export default async function HeaderWrapper() {
  // Fetch thumbnails server-side
  let thumbnails: Record<string, string> = {};

  try {
    thumbnails = await getMenuCategories();
  } catch {
    // Silently fail - will show gradient fallbacks
  }

  return <Header categoryThumbnails={thumbnails} />;
}
