"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../../renderer/lib/utils";
import { Drive } from "../../renderer/src/contexts/DrivesContext";

export function DriveSearchInput({
  drives,
  onSearch,
  onSelectDrive,
  placeholder = "Search your drives...",
}: {
  drives: Drive[];
  onSearch: (query: string) => void;
  onSelectDrive?: (drive: Drive) => void;
  placeholder?: string;
}) {
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredDrives, setFilteredDrives] = useState<Drive[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Generate dynamic placeholders based on available drives
  const placeholders = [
    "Search your drives...",
    "Find files by name...",
    "Browse your hyperdrives...",
    "Search by drive title...",
    ...drives.slice(0, 3).map(drive => `Search in ${drive.title}...`)
  ];

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

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

  // Filter drives based on search query
  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = drives.filter(drive =>
        drive.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        drive.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredDrives(filtered);
      setShowResults(true);
      setSelectedIndex(-1);
    } else {
      setFilteredDrives([]);
      setShowResults(false);
      setSelectedIndex(-1);
    }
  }, [searchQuery, drives]);

  // Handle search input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    onSearch(value);
  };

  // Handle drive selection
  const handleSelectDrive = (drive: Drive) => {
    setSearchQuery(drive.title);
    setShowResults(false);
    onSelectDrive?.(drive);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showResults || filteredDrives.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredDrives.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredDrives.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filteredDrives.length) {
          handleSelectDrive(filteredDrives[selectedIndex]);
        }
        break;
      case "Escape":
        setShowResults(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Handle click outside to close results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (resultsRef.current && !resultsRef.current.contains(event.target as Node)) {
        setShowResults(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full max-w-2xl">
      <form className="relative">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => searchQuery && setShowResults(true)}
            className={cn(
              "w-full h-12 px-4 pr-12 text-sm bg-black/20 border border-white/20 rounded-full",
              "text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500/50",
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

        {/* Search Results Dropdown */}
        <AnimatePresence>
          {showResults && filteredDrives.length > 0 && (
            <motion.div
              ref={resultsRef}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full left-0 right-0 mt-1 bg-black/90 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl z-50 max-h-48 overflow-y-auto"
            >
              {filteredDrives.map((drive, index) => (
                <motion.div
                  key={drive.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    "px-3 py-2 cursor-pointer border-b border-white/10 last:border-b-0",
                    "hover:bg-white/10 transition-colors duration-200",
                    selectedIndex === index && "bg-white/20"
                  )}
                  onClick={() => handleSelectDrive(drive)}
                >
                  <div className="flex items-center space-x-2">
                    {/* Drive icon */}
                    <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                      </svg>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">
                        {drive.title}
                      </p>
                      {drive.description && (
                        <p className="text-white/60 text-sm truncate">
                          {drive.description}
                        </p>
                      )}
                    </div>
                    
                    {/* Drive status indicator */}
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      drive.status === 'active' ? "bg-green-500" :
                      drive.status === 'syncing' ? "bg-yellow-500" : "bg-gray-500"
                    )} />
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* No results message */}
        <AnimatePresence>
          {showResults && searchQuery && filteredDrives.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-1 bg-black/90 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl z-50 p-4"
            >
              <p className="text-white/60 text-center">
                No drives found matching "{searchQuery}"
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </div>
  );
}
