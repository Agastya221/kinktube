"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Category } from "@/lib/types";

interface CategoryNavProps {
  categories: Category[];
}

export default function CategoryNav({ categories }: CategoryNavProps) {
  const pathname = usePathname();

  // Extract current category from pathname
  const currentCategory = pathname.startsWith("/category/")
    ? pathname.split("/category/")[1]
    : null;

  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href="/"
        className={`category-pill ${!currentCategory ? "active" : ""}`}
      >
        All
      </Link>
      {categories.map((category) => (
        <Link
          key={category.slug}
          href={`/category/${category.slug}`}
          className={`category-pill ${currentCategory === category.slug ? "active" : ""}`}
        >
          {category.name}
          {category.video_count > 0 && (
            <span className="ml-1.5 text-xs opacity-70">
              ({category.video_count.toLocaleString()})
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}

// Default categories for static rendering
export const defaultCategories: Category[] = [
  { slug: "femdom", name: "Femdom", video_count: 0 },
  { slug: "bondage", name: "Bondage", video_count: 0 },
  { slug: "bdsm", name: "BDSM", video_count: 0 },
  { slug: "slave", name: "Slave", video_count: 0 },
  { slug: "submission", name: "Submission", video_count: 0 },
  { slug: "spanking", name: "Spanking", video_count: 0 },
  { slug: "latex", name: "Latex", video_count: 0 },
  { slug: "leather", name: "Leather", video_count: 0 },
  { slug: "dominatrix", name: "Dominatrix", video_count: 0 },
  { slug: "strapon", name: "Strapon", video_count: 0 },
];
