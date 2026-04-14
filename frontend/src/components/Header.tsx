"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, Menu, X } from "lucide-react";

export default function Header() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      setMobileMenuOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-background-secondary/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 text-xl font-bold hover:opacity-80 transition-opacity"
          >
            <span className="text-accent">Kink</span>
            <span className="text-foreground">Tube</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className="text-foreground-muted hover:text-foreground transition-colors"
            >
              Home
            </Link>
            <Link
              href="/category/femdom"
              className="text-foreground-muted hover:text-foreground transition-colors"
            >
              Femdom
            </Link>
            <Link
              href="/category/bondage"
              className="text-foreground-muted hover:text-foreground transition-colors"
            >
              Bondage
            </Link>
            <Link
              href="/category/bdsm"
              className="text-foreground-muted hover:text-foreground transition-colors"
            >
              BDSM
            </Link>
          </nav>

          {/* Search Bar */}
          <form
            onSubmit={handleSearch}
            className="hidden sm:flex items-center gap-2 flex-1 max-w-md mx-6"
          >
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search videos..."
                className="search-input pl-10"
              />
            </div>
          </form>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-foreground-muted hover:text-foreground transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border animate-fade-in">
            <form onSubmit={handleSearch} className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search videos..."
                  className="search-input pl-10"
                />
              </div>
            </form>
            <nav className="flex flex-col gap-2">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2 text-foreground-muted hover:text-foreground hover:bg-background-tertiary rounded-lg transition-colors"
              >
                Home
              </Link>
              <Link
                href="/category/femdom"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2 text-foreground-muted hover:text-foreground hover:bg-background-tertiary rounded-lg transition-colors"
              >
                Femdom
              </Link>
              <Link
                href="/category/bondage"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2 text-foreground-muted hover:text-foreground hover:bg-background-tertiary rounded-lg transition-colors"
              >
                Bondage
              </Link>
              <Link
                href="/category/bdsm"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2 text-foreground-muted hover:text-foreground hover:bg-background-tertiary rounded-lg transition-colors"
              >
                BDSM
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
