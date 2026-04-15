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
    "extreme-bondage",
    "femdom",
    "bondage",
    "predicament",
    "mummification",
    "public-humiliation",
    "severe-discipline",
    "sensory-deprivation",
    "shibari",
    "latex",
    "dominatrix",
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

// Default categories for static rendering
export const defaultCategories: Category[] = [
  { slug: "femdom", name: "Femdom", video_count: 0 },
  { slug: "bondage", name: "Bondage", video_count: 0 },
  { slug: "shibari", name: "Shibari", video_count: 0 },
  { slug: "slave", name: "Slave", video_count: 0 },
  { slug: "submission", name: "Submission", video_count: 0 },
  { slug: "chastity", name: "Chastity", video_count: 0 },
  { slug: "device-bondage", name: "Device Bondage", video_count: 0 },
  { slug: "medical-bondage", name: "Medical Bondage", video_count: 0 },
  { slug: "vacbed", name: "Vacbed", video_count: 0 },
  { slug: "spanking", name: "Spanking", video_count: 0 },
  { slug: "caning", name: "Caning", video_count: 0 },
  { slug: "latex", name: "Latex", video_count: 0 },
  { slug: "dominatrix", name: "Dominatrix", video_count: 0 },
  { slug: "public-humiliation", name: "Public Humiliation", video_count: 0 },
  { slug: "whipping", name: "Whipping", video_count: 0 },
  { slug: "cbt", name: "CBT", video_count: 0 },
  { slug: "foot-fetish", name: "Foot Fetish", video_count: 0 },
  { slug: "facesitting", name: "Facesitting", video_count: 0 },
  { slug: "strapon", name: "Strapon", video_count: 0 },
  // Extreme categories
  { slug: "extreme-bondage", name: "Extreme Bondage", video_count: 0 },
  { slug: "predicament", name: "Predicament", video_count: 0 },
  { slug: "mummification", name: "Mummification", video_count: 0 },
  { slug: "sensory-deprivation", name: "Sensory Deprivation", video_count: 0 },
  { slug: "severe-discipline", name: "Severe Discipline", video_count: 0 },
  { slug: "pet-play", name: "Pet Play", video_count: 0 },
];
