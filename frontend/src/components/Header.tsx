"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X, ChevronRight, Flame, Search } from "lucide-react";
import SearchBar from "./SearchBar";

// Featured categories for hamburger menu
const menuCategories = [
  { slug: "extreme-bondage", name: "Extreme Bondage" },
  { slug: "femdom", name: "Femdom" },
  { slug: "bondage", name: "Bondage" },
  { slug: "shibari", name: "Shibari" },
  { slug: "dominatrix", name: "Dominatrix" },
  { slug: "slave", name: "Slave" },
  { slug: "submission", name: "Submission" },
  { slug: "latex", name: "Latex" },
  { slug: "leather", name: "Leather" },
  { slug: "pet-play", name: "Pet Play" },
  { slug: "mummification", name: "Mummification" },
  { slug: "spanking", name: "Spanking" },
  { slug: "cbt", name: "CBT" },
  { slug: "strapon", name: "Strapon" },
  { slug: "facesitting", name: "Facesitting" },
];

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

          {/* Search Bar - Desktop only */}
          <div className="hidden md:block flex-1 max-w-xl ml-auto">
            <SearchBar placeholder="Search videos..." className="w-full" />
          </div>

          {/* Mobile Search Button - links to search page */}
          <Link
            href="/search"
            className="md:hidden ml-auto p-2 text-foreground-muted hover:text-foreground transition-colors"
            aria-label="Search"
          >
            <Search className="w-6 h-6" />
          </Link>
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
        className={`fixed top-0 left-0 h-full w-[85%] max-w-sm bg-[#0a0a0a] z-50 transform transition-transform duration-300 ease-in-out lg:hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Menu Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#27272a]">
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
          <div className="p-4 border-b border-[#27272a]">
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
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-accent" />
                <span className="font-medium">Popular</span>
              </div>
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
            <Link
              href="/?sort=views"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between py-3 text-foreground hover:text-accent transition-colors"
            >
              <span className="font-medium">Most Viewed</span>
              <ChevronRight className="w-5 h-5 text-foreground-muted" />
            </Link>
          </div>

          {/* Categories List */}
          <div className="p-4">
            <h3 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-3">
              Categories
            </h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {menuCategories.map((category) => (
                <Link
                  key={category.slug}
                  href={`/category/${category.slug}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 text-foreground hover:text-accent transition-colors text-sm"
                >
                  {category.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
