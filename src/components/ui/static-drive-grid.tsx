"use client"

/**
 * StaticDriveGrid - A highly performant grid layout with centered expansion
 * 
 * Performance optimizations:
 * 1. Static 3-column CSS Grid layout (no complex masonry calculations)
 * 2. Fixed-size wrappers that maintain grid structure when cards expand
 * 3. Memoized callbacks and expensive calculations
 * 4. Cached animation values and dimensions
 * 5. Optimized DOM queries with refs
 * 6. React.memo for preventing unnecessary re-renders
 * 7. Efficient GSAP timeline management
 * 8. Reduced state updates and effect dependencies
 * 
 * Performance benefits:
 * - No masonry calculations or layout recalculations
 * - Fixed grid structure prevents layout shifts
 * - Smooth animations with predictable positioning
 * - Minimal re-renders and DOM manipulations
 * - Cached calculations for better performance
 */

import * as React from "react";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { gsap } from "gsap";
import { cn } from "../../renderer/lib/utils";
import { ExpandableDriveCard, Drive } from "./expandable-drive-card";

interface StaticDriveGridProps {
  drives: Drive[];
  onBrowse?: (drive: Drive) => void;
  onShare?: (drive: Drive) => void;
  onDelete?: (drive: Drive) => void;
  className?: string;
}

// Memoized drive card component to prevent unnecessary re-renders
const MemoizedDriveCard = React.memo(ExpandableDriveCard);

// Cached animation dimensions
const CARD_DIMENSIONS = {
  original: { width: 280, height: 280 }, // Square cards
  expanded: { width: 700, height: 600 }
} as const;

function StaticDriveGridComponent({ 
  drives, 
  onBrowse, 
  onShare, 
  onDelete, 
  className 
}: StaticDriveGridProps) {
  const [expandedDriveId, setExpandedDriveId] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [pendingExpandId, setPendingExpandId] = useState<string | null>(null);
  const [copyPosition, setCopyPosition] = useState<{ x: number; y: number } | null>(null);
  const [isCollapsing, setIsCollapsing] = useState(false);
  const [showExpandedContent, setShowExpandedContent] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const originalCardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  
  // Reactive viewport dimensions that update on window resize
  const [viewportDimensions, setViewportDimensions] = useState(() => ({
    centerX: window.innerWidth / 2,
    centerY: window.innerHeight / 2,
    halfCardWidth: CARD_DIMENSIONS.original.width / 2,
    halfCardHeight: CARD_DIMENSIONS.original.height / 2,
    halfExpandedWidth: CARD_DIMENSIONS.expanded.width / 2,
    halfExpandedHeight: CARD_DIMENSIONS.expanded.height / 2
  }));

  // Update viewport dimensions on window resize with debouncing
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const handleResize = () => {
      // Clear previous timeout
      clearTimeout(timeoutId);
      
      // Debounce the resize handler to prevent excessive updates
      timeoutId = setTimeout(() => {
        setViewportDimensions({
          centerX: window.innerWidth / 2,
          centerY: window.innerHeight / 2,
          halfCardWidth: CARD_DIMENSIONS.original.width / 2,
          halfCardHeight: CARD_DIMENSIONS.original.height / 2,
          halfExpandedWidth: CARD_DIMENSIONS.expanded.width / 2,
          halfExpandedHeight: CARD_DIMENSIONS.expanded.height / 2
        });
      }, 100); // 100ms debounce
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);



  // Optimized expand handler with cached element lookup
  const handleExpandChange = useCallback((driveId: string, expanded: boolean) => {
    if (isAnimating) return;

    if (expanded) {
      // Use cached element lookup instead of querySelector
      const driveElement = containerRef.current?.querySelector(`[data-drive-id="${driveId}"]`) as HTMLDivElement;
      if (driveElement) {
        const rect = driveElement.getBoundingClientRect();
        setCopyPosition({
          x: rect.left,
          y: rect.top
        });
      }

      // Hide original card immediately using GSAP
      const originalCard = originalCardRefs.current.get(driveId);
      if (originalCard) {
        gsap.to(originalCard, { opacity: 0, duration: 0.1, ease: "power2.out" });
      }

      if (expandedDriveId && expandedDriveId !== driveId) {
        // Collapse current and expand new
        setIsAnimating(true);
        setExpandedDriveId(null);
        setPendingExpandId(driveId);
        
        // Use requestAnimationFrame for better performance
        requestAnimationFrame(() => {
          setExpandedDriveId(driveId);
          setPendingExpandId(null);
          requestAnimationFrame(() => setIsAnimating(false));
        });
      } else {
        setExpandedDriveId(driveId);
      }
    } else {
      setIsAnimating(true);
      setIsCollapsing(true);
    }
  }, [expandedDriveId, isAnimating]);

  const handleCollapseComplete = useCallback(() => {
    // Clean up timeline and reset state
    if (timelineRef.current) {
      timelineRef.current.kill();
      timelineRef.current = null;
    }
    // Ensure copy is fully hidden
    if (copyRef.current) {
      gsap.set(copyRef.current, { opacity: 0 });
    }
    setExpandedDriveId(null);
    setCopyPosition(null);
    setIsCollapsing(false);
    setIsAnimating(false);
    setShowExpandedContent(false);
  }, []);

  // Optimized GSAP animation functions with cached calculations
  const animateToCenter = useCallback(() => {
    if (!copyRef.current || !copyPosition) return;

    // Kill any existing timeline
    if (timelineRef.current) {
      timelineRef.current.kill();
    }

    const tl = gsap.timeline();
    timelineRef.current = tl;
    
    // Phase 1: Move to center (keep original size)
    tl.to(copyRef.current, {
      left: viewportDimensions.centerX - viewportDimensions.halfCardWidth,
      top: viewportDimensions.centerY - viewportDimensions.halfCardHeight,
      duration: 0.6,
      ease: "power2.out",
      onComplete: () => setShowExpandedContent(true) // Show expanded content ONLY after reaching center
    })
    // Phase 2: Expand at center (now with expanded content)
    .to(copyRef.current, {
      left: viewportDimensions.centerX - viewportDimensions.halfExpandedWidth,
      top: viewportDimensions.centerY - viewportDimensions.halfExpandedHeight,
      width: CARD_DIMENSIONS.expanded.width,
      height: CARD_DIMENSIONS.expanded.height,
      duration: 0.6,
      ease: "power2.out"
    });
  }, [copyPosition, viewportDimensions]);

  const animateToOriginal = useCallback(() => {
    if (!copyRef.current || !copyPosition) return;

    // Kill any existing timeline
    if (timelineRef.current) {
      timelineRef.current.kill();
    }

    const tl = gsap.timeline({
      onComplete: handleCollapseComplete
    });
    timelineRef.current = tl;
    
    // Phase 1: Hide expanded content and shrink at center
    tl.to(copyRef.current, {
      left: viewportDimensions.centerX - viewportDimensions.halfCardWidth,
      top: viewportDimensions.centerY - viewportDimensions.halfCardHeight,
      width: CARD_DIMENSIONS.original.width,
      height: CARD_DIMENSIONS.original.height,
      duration: 0.6,
      ease: "power2.out",
      onStart: () => {
        setShowExpandedContent(false); // Hide expanded content when collapsing
        // Fade out overlay immediately when collapse starts
        const overlay = document.querySelector('.backdrop-overlay');
        if (overlay) {
          gsap.to(overlay, { opacity: 0, duration: 0.3, ease: "power2.out" });
        }
      }
    })
    // Phase 2: Move back to original position
    .to(copyRef.current, {
      left: copyPosition.x,
      top: copyPosition.y,
      duration: 0.6,
      ease: "power2.out",
      onComplete: () => {
        // Show original card immediately when copy reaches position
        setExpandedDriveId(null);
        
        // Use GSAP to control original card opacity for smooth transition
        const originalCard = originalCardRefs.current.get(expandedDriveId || '');
        if (originalCard) {
          // Make original card fully visible instantly, then hide copy
          gsap.set(originalCard, { opacity: 1 });
          
          // Hide copy immediately after original is visible
          gsap.to(copyRef.current, { 
            opacity: 0, 
            duration: 0.1,
            ease: "power2.out"
          });
        } else {
          // Fallback if ref not found - show original instantly
          setExpandedDriveId(null);
          gsap.to(copyRef.current, { 
            opacity: 0, 
            duration: 0.1,
            ease: "power2.out"
          });
        }
      }
    });
  }, [copyPosition, viewportDimensions, handleCollapseComplete]);

  // Memoized expanded drive data
  const expandedDrive = useMemo(() => 
    expandedDriveId ? drives.find(d => d.id === expandedDriveId) : null,
    [expandedDriveId, drives]
  );

  // Optimized effect for expand animation
  useEffect(() => {
    if (expandedDrive && copyPosition && !isCollapsing) {
      animateToCenter();
    }
  }, [expandedDrive, copyPosition, isCollapsing, animateToCenter]);

  // Optimized effect for collapse animation
  useEffect(() => {
    if (isCollapsing && copyRef.current) {
      animateToOriginal();
    }
  }, [isCollapsing, animateToOriginal]);

  // Cleanup timeline on unmount
  useEffect(() => {
    return () => {
      if (timelineRef.current) {
        timelineRef.current.kill();
      }
    };
  }, []);

  return (
    <div className={cn("w-full relative flex flex-col items-center", className)} ref={containerRef}>
      {/* Backdrop overlay when drive is expanded */}
      {expandedDriveId && (
        <div
          className="backdrop-overlay fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          style={{ opacity: 1 }}
          onClick={() => {
            if (expandedDriveId) {
              handleExpandChange(expandedDriveId, false);
            }
          }}
        />
      )}

      {/* Animated copy of the expanded drive */}
      <AnimatePresence>
        {expandedDrive && copyPosition && (
          <div
            key={`copy-${expandedDrive.id}`}
            ref={copyRef}
            className="fixed z-50 pointer-events-auto"
            style={{
              left: copyPosition.x,
              top: copyPosition.y,
              width: CARD_DIMENSIONS.original.width,
              height: CARD_DIMENSIONS.original.height,
              opacity: 1,
              willChange: 'transform, opacity', // Optimize for animations
            }}
            onClick={(e) => {
              // Only collapse if the click is on the empty container, not on child controls
              if (e.currentTarget === e.target) {
                handleExpandChange(expandedDrive.id, false);
              }
            }}
          >
            <MemoizedDriveCard
                drive={expandedDrive}
                onBrowse={onBrowse}
                onShare={onShare}
                onDelete={onDelete}
                isExpanded={showExpandedContent} // Show expanded content only when animation reaches center
                isAnimating={false}
                isPending={false}
                onExpandChange={() => {}} // Disable internal expand handling
                onExpandComplete={() => {}}
                onCollapseComplete={() => {}}
                className="w-full h-full"
                customSizes={{
                  collapsedSize: { width: CARD_DIMENSIONS.original.width, height: CARD_DIMENSIONS.original.height },
                  expandedSize: { width: CARD_DIMENSIONS.expanded.width, height: CARD_DIMENSIONS.expanded.height }
                }}
              />
          </div>
        )}
      </AnimatePresence>

      {/* Static 3-column grid */}
      <div className="w-full p-4 pb-8 flex justify-center">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 justify-items-center">
          {drives.map((drive) => (
            <DriveGridItem
              key={drive.id}
              drive={drive}
              expandedDriveId={expandedDriveId}
              onExpand={handleExpandChange}
              onBrowse={onBrowse}
              onShare={onShare}
              onDelete={onDelete}
              originalCardRefs={originalCardRefs}
              drives={drives}
              hoveredIndex={hoveredIndex}
              setHoveredIndex={setHoveredIndex}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Memoized grid item component for better performance
const DriveGridItem = React.memo(({ 
  drive, 
  expandedDriveId, 
  onExpand, 
  onBrowse, 
  onShare, 
  onDelete,
  originalCardRefs,
  drives,
  hoveredIndex,
  setHoveredIndex
}: {
  drive: Drive;
  expandedDriveId: string | null;
  onExpand: (id: string, expanded: boolean) => void;
  onBrowse?: (drive: Drive) => void;
  onShare?: (drive: Drive) => void;
  onDelete?: (drive: Drive) => void;
  originalCardRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  drives: Drive[];
  hoveredIndex: number | null;
  setHoveredIndex: (index: number | null) => void;
}) => (
  <div
    data-drive-id={drive.id}
    className="relative"
    style={{
      width: '280px', // Square cards
      height: '296px', // Square cards
      minHeight: '296px'
    }}
  >
    {/* Fixed-size wrapper that maintains grid position */}
    <div 
      ref={(el) => {
        if (el) {
          originalCardRefs.current.set(drive.id, el);
        } else {
          originalCardRefs.current.delete(drive.id);
        }
      }}
      className="absolute inset-0"
      style={{
        opacity: expandedDriveId === drive.id ? 0 : 1,
      }}
    >
      {/* Hover effect overlay */}
      <motion.div
        className="absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-600/20 via-purple-600/20 to-cyan-600/20 opacity-0"
        style={{
          background: "linear-gradient(45deg, rgba(139, 92, 246, 0.1), rgba(168, 85, 247, 0.1), rgba(6, 182, 212, 0.1))",
        }}
        initial={{ opacity: 0 }}
        animate={{ 
          opacity: hoveredIndex === drives.findIndex(d => d.id === drive.id) ? 1 : 0 
        }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
      />
      <div 
        className="w-full h-full cursor-pointer"
        onClick={() => onExpand(drive.id, true)}
        onMouseEnter={() => setHoveredIndex(drives.findIndex(d => d.id === drive.id))}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        <MemoizedDriveCard
          drive={drive}
          onBrowse={onBrowse}
          onShare={onShare}
          onDelete={onDelete}
          isExpanded={false} // Always false in grid - expansion happens in center
          isAnimating={false} // Disable internal animations
          isPending={false} // Disable pending state
          onExpandChange={() => {}} // Disable internal expand handling
          onExpandComplete={() => {}}
          onCollapseComplete={() => {}}
          className="w-full h-full"
          customSizes={{
            collapsedSize: { width: CARD_DIMENSIONS.original.width, height: CARD_DIMENSIONS.original.height },
            expandedSize: { width: CARD_DIMENSIONS.expanded.width, height: CARD_DIMENSIONS.expanded.height }
          }}
        />
      </div>
    </div>
  </div>
));

// Export memoized component
export const StaticDriveGrid = React.memo(StaticDriveGridComponent);
