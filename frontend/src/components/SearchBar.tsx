"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Loader2 } from "lucide-react";

interface SearchBarProps {
  placeholder?: string;
  className?: string;
}

interface SearchSuggestion {
  id: string;
  title: string;
  type: "result" | "suggestion";
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
  "mummification",
  "predicament bondage",
  "strapon",
  "cbt",
  "foot worship",
  "facesitting",
  "leather",
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
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setQuery(searchParams.get("q") || "");
  }, [searchParams]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionRef.current &&
        !suggestionRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch live suggestions from API with debouncing
  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      // Show popular searches when query is empty or too short
      const filtered = popularSearches
        .filter((s) => !searchQuery || s.toLowerCase().includes(searchQuery.toLowerCase()))
        .slice(0, 8)
        .map((s) => ({ id: s, title: s, type: "suggestion" as const }));
      setSuggestions(filtered);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // Fetch live results from Eporner via our API
      const response = await fetch(
        `${API_BASE_URL}/api/search?q=${encodeURIComponent(searchQuery)}&per_page=6`
      );

      if (!response.ok) throw new Error("Search failed");

      const data = await response.json();

      const results: SearchSuggestion[] = [];

      // Add matching popular searches first
      const matchingPopular = popularSearches
        .filter((s) => s.toLowerCase().includes(searchQuery.toLowerCase()))
        .slice(0, 3)
        .map((s) => ({ id: `suggest-${s}`, title: s, type: "suggestion" as const }));

      results.push(...matchingPopular);

      // Add live video results
      if (data.videos && data.videos.length > 0) {
        const videoResults = data.videos.slice(0, 5).map((v: { id: string; title: string }) => ({
          id: `video-${v.id}`,
          title: v.title,
          type: "result" as const,
        }));
        results.push(...videoResults);
      }

      setSuggestions(results.slice(0, 8));
    } catch {
      // On error, show matching popular searches
      const filtered = popularSearches
        .filter((s) => s.toLowerCase().includes(searchQuery.toLowerCase()))
        .slice(0, 8)
        .map((s) => ({ id: s, title: s, type: "suggestion" as const }));
      setSuggestions(filtered);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedIndex(-1);
    setShowSuggestions(true);

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce API calls (300ms)
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (query.trim()) {
      setShowSuggestions(false);
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    const searchTerm = suggestion.type === "suggestion" ? suggestion.title : query;
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

  const clearSearch = () => {
    setQuery("");
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const handleFocus = () => {
    setShowSuggestions(true);
    if (!query.trim()) {
      // Show popular searches on focus
      const popular = popularSearches.slice(0, 8).map((s) => ({
        id: s,
        title: s,
        type: "suggestion" as const,
      }));
      setSuggestions(popular);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`}>
      <div className="relative">
        {/* Search Icon */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {isLoading ? (
            <Loader2 className="w-5 h-5 text-foreground-muted animate-spin" />
          ) : (
            <Search className="w-5 h-5 text-foreground-muted" />
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
          className="search-input w-full pl-11 pr-24 py-3 text-base"
          autoComplete="off"
        />

        {/* Clear Button */}
        {query && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-20 top-1/2 -translate-y-1/2 p-1 text-foreground-muted hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Search Button */}
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
        >
          <Search className="w-4 h-4" />
          <span className="hidden sm:inline">Search</span>
        </button>
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionRef}
          className="absolute z-50 w-full mt-1 bg-background-secondary border border-border rounded-lg shadow-lg overflow-hidden"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors ${
                index === selectedIndex
                  ? "bg-accent/20 text-foreground"
                  : "hover:bg-background-tertiary text-foreground"
              }`}
            >
              {suggestion.type === "suggestion" ? (
                <Search className="w-4 h-4 text-foreground-muted flex-shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded bg-accent/30 flex-shrink-0" />
              )}
              <span className="truncate">
                {suggestion.type === "suggestion" ? (
                  suggestion.title
                ) : (
                  <span className="text-sm">{suggestion.title}</span>
                )}
              </span>
              {suggestion.type === "suggestion" && (
                <span className="text-xs text-foreground-muted ml-auto">Search</span>
              )}
            </button>
          ))}

          {/* Search hint */}
          <div className="px-4 py-2 text-xs text-foreground-muted border-t border-border bg-background-tertiary/50">
            Press Enter to search or use arrow keys to navigate
          </div>
        </div>
      )}
    </form>
  );
}
