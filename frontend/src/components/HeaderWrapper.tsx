import Header from "./Header";
import { getMenuCategories } from "@/lib/api";

export default async function HeaderWrapper() {
  // Fetch category thumbnails server-side so the mobile menu renders with
  // real images on first paint. Revalidates every 10 minutes via Next.js cache.
  let categoryThumbnails: Record<string, string> = {};
  try {
    categoryThumbnails = await getMenuCategories();
  } catch {
    // non-fatal — Header gracefully falls back to gradient placeholders
  }

  return <Header categoryThumbnails={categoryThumbnails} />;
}
