"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Menu, X, ChevronRight } from "lucide-react";
import SearchBar from "./SearchBar";
import type { Category } from "@/lib/types";

// Category images (placeholder URLs - replace with actual thumbnails)
const categoryImages: Record<string, string> = {
  "extreme-bondage": "/categories/extreme-bondage.jpg",
  "femdom": "/categories/femdom.jpg",
  "bondage": "/categories/bondage.jpg",
  "shibari": "/categories/shibari.jpg",
  "latex": "/categories/latex.jpg",
  "leather": "/categories/leather.jpg",
  "dominatrix": "/categories/dominatrix.jpg",
  "slave": "/categories/slave.jpg",
  "submission": "/categories/submission.jpg",
  "pet-play": "/categories/pet-play.jpg",
  "mummification": "/categories/mummification.jpg",
  "spanking": "/categories/spanking.jpg",
  "cbt": "/categories/cbt.jpg",
  "strapon": "/categories/strapon.jpg",
  "facesitting": "/categories/facesitting.jpg",
};

// Featured categories for hamburger menu
const menuCategories: Category[] = [
  { slug: "extreme-bondage", name: "Extreme Bondage", video_count: 0 },
  { slug: "femdom", name: "Femdom", video_count: 0 },
  { slug: "bondage", name: "Bondage", video_count: 0 },
  { slug: "shibari", name: "Shibari", video_count: 0 },
  { slug: "dominatrix", name: "Dominatrix", video_count: 0 },
  { slug: "slave", name: "Slave", video_count: 0 },
  { slug: "submission", name: "Submission", video_count: 0 },
  { slug: "latex", name: "Latex", video_count: 0 },
  { slug: "leather", name: "Leather", video_count: 0 },
  { slug: "pet-play", name: "Pet Play", video_count: 0 },
  { slug: "mummification", name: "Mummification", video_count: 0 },
  { slug: "spanking", name: "Spanking", video_count: 0 },
  { slug: "cbt", name: "CBT", video_count: 0 },
  { slug: "strapon", name: "Strapon", video_count: 0 },
  { slug: "facesitting", name: "Facesitting", video_count: 0 },
];

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, []);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  return (
    <header className="sticky top-0 z-50 bg-background-secondary/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16 gap-4">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 -ml-2 text-foreground-muted hover:text-foreground transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-1 text-xl font-bold hover:opacity-80 transition-opacity flex-shrink-0"
          >
            <span className="text-accent">Kink</span>
            <span className="text-foreground">Tube</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-5 ml-6">
            <Link
              href="/"
              className="text-foreground-muted hover:text-foreground transition-colors text-sm"
            >
              Home
            </Link>
            <Link
              href="/category/femdom"
              className="text-foreground-muted hover:text-foreground transition-colors text-sm"
            >
              Femdom
            </Link>
            <Link
              href="/category/bondage"
              className="text-foreground-muted hover:text-foreground transition-colors text-sm"
            >
              Bondage
            </Link>
            <Link
              href="/category/extreme-bondage"
              className="text-foreground-muted hover:text-foreground transition-colors text-sm"
            >
              Extreme
            </Link>
            <Link
              href="/category/shibari"
              className="text-foreground-muted hover:text-foreground transition-colors text-sm"
            >
              Shibari
            </Link>
          </nav>

          {/* Search Bar - Always visible */}
          <div className="flex-1 max-w-xl ml-auto">
            <SearchBar
              placeholder="Search videos..."
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Menu Panel */}
      <div
        className={`fixed top-0 left-0 h-full w-[85%] max-w-sm bg-background-secondary z-50 transform transition-transform duration-300 ease-in-out lg:hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Menu Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-1 text-xl font-bold"
          >
            <span className="text-accent">Kink</span>
            <span className="text-foreground">Tube</span>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 text-foreground-muted hover:text-foreground"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Menu Content */}
        <div className="overflow-y-auto h-[calc(100%-65px)]">
          {/* Quick Links */}
          <div className="p-4 border-b border-border">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between py-3 text-foreground hover:text-accent transition-colors"
            >
              <span className="font-medium">Home</span>
              <ChevronRight className="w-5 h-5 text-foreground-muted" />
            </Link>
            <Link
              href="/?sort=rating"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between py-3 text-foreground hover:text-accent transition-colors"
            >
              <span className="font-medium">Top Rated</span>
              <ChevronRight className="w-5 h-5 text-foreground-muted" />
            </Link>
            <Link
              href="/?sort=views"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between py-3 text-foreground hover:text-accent transition-colors"
            >
              <span className="font-medium">Most Viewed</span>
              <ChevronRight className="w-5 h-5 text-foreground-muted" />
            </Link>
            <Link
              href="/?sort=latest"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between py-3 text-foreground hover:text-accent transition-colors"
            >
              <span className="font-medium">Newest</span>
              <ChevronRight className="w-5 h-5 text-foreground-muted" />
            </Link>
          </div>

          {/* Categories Grid */}
          <div className="p-4">
            <h3 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-3">
              Categories
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {menuCategories.map((category) => (
                <Link
                  key={category.slug}
                  href={`/category/${category.slug}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="relative group overflow-hidden rounded-lg aspect-[4/3] bg-background-tertiary"
                >
                  {/* Category Image or Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-background-tertiary">
                    {categoryImages[category.slug] && (
                      <Image
                        src={categoryImages[category.slug]}
                        alt={category.name}
                        fill
                        className="object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                        sizes="150px"
                      />
                    )}
                  </div>
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                  {/* Label */}
                  <div className="absolute bottom-0 left-0 right-0 p-2">
                    <span className="text-white text-sm font-medium">
                      {category.name}
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {/* View All Categories */}
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="mt-4 flex items-center justify-center gap-2 py-3 bg-background-tertiary rounded-lg text-foreground-muted hover:text-foreground hover:bg-border transition-colors"
            >
              <span className="text-sm font-medium">View All Categories</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
