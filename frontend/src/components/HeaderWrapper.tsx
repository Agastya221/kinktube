import Header from "./Header";
import { getCategoryThumbnails } from "@/lib/api";

// Categories that will have thumbnails in the hamburger menu
const menuCategorySlugs = [
  "extreme-bondage",
  "femdom",
  "bondage",
  "shibari",
  "dominatrix",
  "slave",
  "submission",
  "latex",
  "leather",
  "pet-play",
  "mummification",
  "spanking",
  "cbt",
  "strapon",
  "facesitting",
];

export default async function HeaderWrapper() {
  // Fetch thumbnails server-side
  let thumbnails: Record<string, string> = {};

  try {
    thumbnails = await getCategoryThumbnails(menuCategorySlugs);
  } catch {
    // Silently fail - will show gradient fallbacks
  }

  return <Header categoryThumbnails={thumbnails} />;
}
