"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
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

  const featuredSlugs = [
    "femdom",
    "bondage",
    "bdsm",
    "submission",
    "spanking",
    "latex",
    "dominatrix",
    "strapon",
    "shibari",
    "chastity",
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
            {category.video_count > 0 && (
              <span className="ml-1.5 text-xs opacity-70">
                ({category.video_count.toLocaleString()})
              </span>
            )}
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
              {category.video_count > 0 && (
                <span className="ml-1.5 text-xs opacity-70">
                  ({category.video_count.toLocaleString()})
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// Default categories for static rendering
export const defaultCategories: Category[] = [
  { slug: "femdom", name: "Femdom", video_count: 0 },
  { slug: "bondage", name: "Bondage", video_count: 0 },
  { slug: "shibari", name: "Shibari", video_count: 0 },
  { slug: "bdsm", name: "BDSM", video_count: 0 },
  { slug: "slave", name: "Slave", video_count: 0 },
  { slug: "submission", name: "Submission", video_count: 0 },
  { slug: "chastity", name: "Chastity", video_count: 0 },
  { slug: "device-bondage", name: "Device Bondage", video_count: 0 },
  { slug: "medical-bondage", name: "Medical Bondage", video_count: 0 },
  { slug: "spanking", name: "Spanking", video_count: 0 },
  { slug: "caning", name: "Caning", video_count: 0 },
  { slug: "latex", name: "Latex", video_count: 0 },
  { slug: "leather", name: "Leather", video_count: 0 },
  { slug: "dominatrix", name: "Dominatrix", video_count: 0 },
  { slug: "strapon", name: "Strapon", video_count: 0 },
];
