"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Loader2, TrendingUp } from "lucide-react";

interface SearchBarProps {
  placeholder?: string;
  className?: string;
}

interface SearchSuggestion {
  id: string;
  title: string;
  type: "result" | "suggestion" | "trending";
}

// Popular BDSM search terms for suggestions
const popularSearches = [
  "extreme bondage",
  "femdom",
  "shibari",
  "latex",
  "spanking",
  "chastity",
  "pet play",
  "medical bondage",
  "vacbed",
  "mummification",
  "predicament bondage",
  "strapon",
  "cbt",
  "foot worship",
  "facesitting",
  "whipping",
  "dominatrix",
  "slave training",
  "rope bondage",
  "device bondage",
  "sensory deprivation",
];

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export default function SearchBar({
  placeholder = "Search extreme BDSM, bondage, femdom...",
  className = "",
}: SearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Sync query with URL params
  useEffect(() => {
    setQuery(searchParams.get("q") || "");
  }, [searchParams]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Get popular suggestions (no API call needed)
  const getPopularSuggestions = useCallback((searchQuery: string): SearchSuggestion[] => {
    const q = searchQuery.toLowerCase().trim();

    if (!q) {
      // Show trending when empty
      return popularSearches.slice(0, 8).map((s) => ({
        id: `trending-${s}`,
        title: s,
        type: "trending" as const,
      }));
    }

    // Filter by what matches the query
    return popularSearches
      .filter((s) => s.toLowerCase().includes(q))
      .slice(0, 6)
      .map((s) => ({
        id: `suggest-${s}`,
        title: s,
        type: "suggestion" as const,
      }));
  }, []);

  // Fetch live suggestions from API
  const fetchLiveSuggestions = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setSuggestions(getPopularSuggestions(searchQuery));
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/search?q=${encodeURIComponent(searchQuery)}&per_page=6&sort=top-rated`,
        { signal: AbortSignal.timeout(5000) } // 5s timeout
      );

      if (!response.ok) throw new Error("Search failed");

      const data = await response.json();
      const results: SearchSuggestion[] = [];

      // Add matching popular searches first (always available)
      const popularMatches = getPopularSuggestions(searchQuery);
      results.push(...popularMatches.slice(0, 3));

      // Add live video results if available
      if (data.videos && data.videos.length > 0) {
        const videoResults = data.videos.slice(0, 5).map((v: { id: number; title: string }) => ({
          id: `video-${v.id}`,
          title: v.title,
          type: "result" as const,
        }));
        results.push(...videoResults);
      }

      setSuggestions(results.slice(0, 8));
    } catch {
      // On error, just show popular matches
      setSuggestions(getPopularSuggestions(searchQuery));
    } finally {
      setIsLoading(false);
    }
  }, [getPopularSuggestions]);

  // Debounced input handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedIndex(-1);
    setShowSuggestions(true);

    // Show popular suggestions immediately
    setSuggestions(getPopularSuggestions(value));

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce live API calls (400ms)
    if (value.length >= 2) {
      debounceRef.current = setTimeout(() => {
        fetchLiveSuggestions(value);
      }, 400);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (query.trim()) {
      setShowSuggestions(false);
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    const searchTerm = suggestion.type === "result" ? query : suggestion.title;
    setQuery(searchTerm);
    setShowSuggestions(false);
    router.push(`/search?q=${encodeURIComponent(searchTerm)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        if (selectedIndex >= 0) {
          e.preventDefault();
          handleSuggestionClick(suggestions[selectedIndex]);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleFocus = () => {
    setShowSuggestions(true);
    setSuggestions(getPopularSuggestions(query));
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit}>
        <div className="relative">
          {/* Search Icon */}
          <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
            {isLoading ? (
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-foreground-muted animate-spin" />
            ) : (
              <Search className="w-4 h-4 sm:w-5 sm:h-5 text-foreground-muted" />
            )}
          </div>

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            placeholder={placeholder}
            className="w-full bg-background-secondary border border-border rounded-lg pl-11 pr-14 sm:pr-20 py-2.5 sm:py-3 text-sm sm:text-base text-foreground placeholder-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all duration-200"
            autoComplete="off"
            spellCheck={false}
          />


          {/* Search Button */}
          <button
            type="submit"
            className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 p-2 sm:px-3 sm:py-1.5 bg-accent hover:bg-accent-hover text-white rounded-md sm:rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">Search</span>
          </button>
        </div>
      </form>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 z-[100] mt-2 bg-[#111111] border border-[#27272a] rounded-lg shadow-2xl overflow-hidden">
          {/* Header for trending */}
          {!query && (
            <div className="px-4 py-2 text-xs font-medium text-foreground-muted border-b border-[#27272a] flex items-center gap-2 bg-[#1a1a1a]">
              <TrendingUp className="w-3 h-3" />
              Trending Searches
            </div>
          )}

          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors ${
                index === selectedIndex
                  ? "bg-accent/20 text-white"
                  : "hover:bg-[#1a1a1a] text-[#fafafa]"
              }`}
            >
              {suggestion.type === "result" ? (
                <div className="w-5 h-5 rounded bg-accent/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] text-accent">V</span>
                </div>
              ) : suggestion.type === "trending" ? (
                <TrendingUp className="w-4 h-4 text-accent flex-shrink-0" />
              ) : (
                <Search className="w-4 h-4 text-[#a1a1aa] flex-shrink-0" />
              )}

              <span className="truncate flex-1 text-sm">
                {suggestion.title}
              </span>

              {suggestion.type !== "result" && (
                <span className="text-xs text-[#a1a1aa] flex-shrink-0">
                  {suggestion.type === "trending" ? "Trending" : "Search"}
                </span>
              )}
            </button>
          ))}

          {/* Footer hint */}
          <div className="px-4 py-2 text-xs text-[#a1a1aa] border-t border-[#27272a] bg-[#0a0a0a]/50 flex items-center justify-between">
            <span>Press Enter to search</span>
            <span className="hidden sm:inline">Use arrow keys to navigate</span>
          </div>
        </div>
      )}
    </div>
  );
}
