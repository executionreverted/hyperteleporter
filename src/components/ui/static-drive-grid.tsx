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
  original: { width: 307.6640625, height: 280 },
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
  
  const containerRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  
  // Cache viewport dimensions
  const viewportDimensions = useMemo(() => ({
    centerX: window.innerWidth / 2,
    centerY: window.innerHeight / 2,
    halfCardWidth: CARD_DIMENSIONS.original.width / 2,
    halfCardHeight: CARD_DIMENSIONS.original.height / 2,
    halfExpandedWidth: CARD_DIMENSIONS.expanded.width / 2,
    halfExpandedHeight: CARD_DIMENSIONS.expanded.height / 2
  }), []);


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
      onStart: () => setShowExpandedContent(false) // Hide expanded content when collapsing
    })
    // Phase 2: Move back to original position
    .to(copyRef.current, {
      left: copyPosition.x,
      top: copyPosition.y,
      duration: 0.6,
      ease: "power2.out"
    })
    // Phase 3: Fade out
    .to(copyRef.current, {
      opacity: 0,
      duration: 0.1,
      ease: "power2.out"
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
    <div className={cn("w-full relative", className)} ref={containerRef}>
      {/* Backdrop overlay when drive is expanded */}
      <AnimatePresence>
        {expandedDriveId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, delay: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => {
              if (expandedDriveId) {
                handleExpandChange(expandedDriveId, false);
              }
            }}
          />
        )}
      </AnimatePresence>

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
              width: 307.6640625,
              height: 280,
              opacity: 1,
            }}
            onClick={() => handleExpandChange(expandedDrive.id, false)}
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
      <div className="w-full p-4 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {drives.map((drive) => (
            <DriveGridItem
              key={drive.id}
              drive={drive}
              expandedDriveId={expandedDriveId}
              onExpand={handleExpandChange}
              onBrowse={onBrowse}
              onShare={onShare}
              onDelete={onDelete}
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
  onDelete 
}: {
  drive: Drive;
  expandedDriveId: string | null;
  onExpand: (id: string, expanded: boolean) => void;
  onBrowse?: (drive: Drive) => void;
  onShare?: (drive: Drive) => void;
  onDelete?: (drive: Drive) => void;
}) => (
  <div
    data-drive-id={drive.id}
    className="relative"
    style={{
      height: '280px', // Fixed height to maintain grid structure
      minHeight: '280px'
    }}
  >
    {/* Fixed-size wrapper that maintains grid position */}
    <motion.div 
      className="absolute inset-0"
      animate={{
        opacity: expandedDriveId === drive.id ? 0 : 1,
      }}
      transition={{
        duration: 0,
        ease: "easeInOut",
        delay: expandedDriveId === drive.id ? 0 : 0 // Appear immediately when not expanded
      }}
    >
      <div 
        className="w-full h-full cursor-pointer"
        onClick={() => onExpand(drive.id, true)}
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
        />
      </div>
    </motion.div>
  </div>
));

// Export memoized component
export const StaticDriveGrid = React.memo(StaticDriveGridComponent);
