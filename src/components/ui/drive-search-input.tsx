"use client";

import { useEffect, useRef, useState, forwardRef } from "react";
import { cn } from "../../renderer/lib/utils";
import { Drive } from "../../renderer/src/contexts/DrivesContext";

export const DriveSearchInput = forwardRef<HTMLInputElement, {
  drives: Drive[];
  onSearch: (query: string) => void;
  onSelectDrive?: (drive: Drive) => void;
  placeholder?: string;
}>(function DriveSearchInput({
  drives,
  onSearch,
  onSelectDrive,
  placeholder = "Search your drives...",
}, ref) {
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const internalRef = useRef<HTMLInputElement>(null);
  // Autocomplete disabled — filtering is handled by parent list

  // Generate dynamic placeholders based on available drives
  const placeholders = [
    "Search your drives...",
    "Find files by name...",
    "Browse your hyperdrives...",
    "Search by drive title...",
    ...drives.slice(0, 3).map(drive => `Search in ${drive.title}...`)
  ];

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  // No results dropdown anymore

  // Combine internal ref with forwarded ref
  const combinedRef = (node: HTMLInputElement | null) => {
    internalRef.current = node;
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  };

  const startAnimation = () => {
    intervalRef.current = setInterval(() => {
      setCurrentPlaceholder((prev) => (prev + 1) % placeholders.length);
    }, 3000);
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState !== "visible" && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    } else if (document.visibilityState === "visible") {
      startAnimation();
    }
  };

  useEffect(() => {
    startAnimation();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [placeholders]);

  // Parent handles filtering of drives based on query

  // Handle search input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    onSearch(value);
  };

  // No keyboard navigation — no dropdown

  // No dropdown anymore — no outside click handling needed

  return (
    <div className="relative w-full max-w-2xl">
      <form className="relative">
        <div className="relative">
          <input
            ref={combinedRef}
            type="text"
            value={searchQuery}
            onChange={handleChange}
            // Autocomplete removed; focusing does not open any dropdown
            className={cn(
              "w-full h-12 px-4 pr-12 text-sm bg-black/20 border border-white/20 rounded-full",
              "text-white placeholder:text-white/60 focus:outline-none",
              "backdrop-blur-sm transition-all duration-300"
            )}
            placeholder={placeholders[currentPlaceholder]}
          />
          
          {/* Search icon */}
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
            <svg
              className="w-4 h-4 text-white/60"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>
      </form>
    </div>
  );
});
