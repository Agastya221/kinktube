"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { defaultCategories } from "@/lib/default-categories";
import type { Category } from "@/lib/types";

interface CategoryNavProps {
  categories: Category[];
}

export default function CategoryNav({ categories }: CategoryNavProps) {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);

  // Extract current category from pathname
  const currentCategory = pathname.startsWith("/category/")
    ? pathname.split("/category/")[1]
    : null;

  // Organized by type for better UX
  const featuredSlugs = [
    // Bondage types together
    "bondage",
    "extreme-bondage",
    "shibari",
    "mummification",
    "predicament",
    // Domination together
    "femdom",
    "dominatrix",
    // Materials
    "latex",
    // Discipline
    "spanking",
    "severe-discipline",
    // Other popular
    "public-humiliation",
  ];

  const categoryMap = new Map(categories.map((category) => [category.slug, category]));
  const featuredCategories = featuredSlugs
    .map((slug) => categoryMap.get(slug))
    .filter((category): category is Category => Boolean(category));
  const extraCategories = categories.filter((category) => !featuredSlugs.includes(category.slug));
  const shouldShowMore = showMore || (!!currentCategory && extraCategories.some((category) => category.slug === currentCategory));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Link
          href="/"
          className={`category-pill ${!currentCategory ? "active" : ""}`}
        >
          All
        </Link>
        {featuredCategories.map((category) => (
          <Link
            key={category.slug}
            href={`/category/${category.slug}`}
            className={`category-pill ${currentCategory === category.slug ? "active" : ""}`}
          >
            {category.name}
          </Link>
        ))}
        {extraCategories.length > 0 && (
          <button
            type="button"
            onClick={() => setShowMore((value) => !value)}
            className={`category-pill ${shouldShowMore ? "active" : ""}`}
          >
            {shouldShowMore ? "Less" : `More (${extraCategories.length})`}
          </button>
        )}
      </div>

      {shouldShowMore && extraCategories.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {extraCategories.map((category) => (
            <Link
              key={category.slug}
              href={`/category/${category.slug}`}
              className={`category-pill ${currentCategory === category.slug ? "active" : ""}`}
            >
              {category.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export { defaultCategories };
