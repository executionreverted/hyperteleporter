"use client"

/**
 * StaticDriveGrid - A performant grid layout with centered expansion
 * 
 * This component provides a much more performant approach by:
 * 1. Using a static 3-column CSS Grid layout (no complex masonry calculations)
 * 2. Fixed-size wrappers that maintain grid structure when cards expand
 * 3. Smooth centered expansion with fixed positioning
 * 4. No layout reflows or expensive calculations
 * 
 * Performance benefits:
 * - No masonry calculations or layout recalculations
 * - Fixed grid structure prevents layout shifts
 * - Smooth animations with predictable positioning
 * - Much faster rendering and interactions
 */

import * as React from "react";
import { useState, useCallback, useRef, useEffect } from "react";
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

export function StaticDriveGrid({ 
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
  const containerRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);


  // Simple expand handler - capture position and toggle the expanded drive
  const handleExpandChange = useCallback((driveId: string, expanded: boolean) => {
    if (isAnimating) {
      return;
    }

    if (expanded) {
      // Capture the current position of the clicked element
      const driveElement = containerRef.current?.querySelector(`[data-drive-id="${driveId}"]`) as HTMLDivElement;
      if (driveElement) {
        const rect = driveElement.getBoundingClientRect();
        console.log('Original card dimensions:', {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          right: rect.right,
          bottom: rect.bottom
        });
        setCopyPosition({
          x: rect.left, // Top-left of the original card
          y: rect.top   // Top-left of the original card
        });
      }

      if (expandedDriveId && expandedDriveId !== driveId) {
        // If another drive is already expanded, collapse it first
        setIsAnimating(true);
        setExpandedDriveId(null);
        setPendingExpandId(driveId);
        
        setTimeout(() => {
          setExpandedDriveId(driveId);
          setPendingExpandId(null);
          setTimeout(() => {
            setIsAnimating(false);
          }, 100);
        }, 300);
      } else {
        setExpandedDriveId(driveId);
      }
    } else {
      setIsAnimating(true);
      setIsCollapsing(true);
      
      // Animation will complete via onAnimationComplete callback
    }
  }, [expandedDriveId, isAnimating]);

  const handleExpandComplete = useCallback(() => {
    // No special handling needed for expand
  }, []);

  const handleCollapseComplete = useCallback(() => {
    // Reset state when collapse animation completes
    setExpandedDriveId(null);
    setCopyPosition(null);
    setIsCollapsing(false);
    setIsAnimating(false);
  }, []);

  // GSAP animation functions
  const animateToCenter = useCallback(() => {
    if (!copyRef.current || !copyPosition) return;

    const tl = gsap.timeline();
    
    // Phase 1: Move to center (keep original size)
    tl.to(copyRef.current, {
      left: window.innerWidth / 2 - 153.83203125,
      top: window.innerHeight / 2 - 140,
      duration: 0.6,
      ease: "power2.out"
    })
    // Phase 2: Expand at center
    .to(copyRef.current, {
      left: window.innerWidth / 2 - 300,
      top: window.innerHeight / 2 - 250,
      width: 600,
      height: 500,
      duration: 0.6,
      ease: "power2.out"
    });
  }, [copyPosition]);

  const animateToOriginal = useCallback(() => {
    if (!copyRef.current || !copyPosition) return;

    const tl = gsap.timeline({
      onComplete: handleCollapseComplete
    });
    
    // Phase 1: Shrink at center
    tl.to(copyRef.current, {
      left: window.innerWidth / 2 - 153.83203125,
      top: window.innerHeight / 2 - 140,
      width: 307.6640625,
      height: 280,
      duration: 0.6,
      ease: "power2.out"
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
  }, [copyPosition, handleCollapseComplete]);

  // Get the expanded drive data
  const expandedDrive = expandedDriveId ? drives.find(d => d.id === expandedDriveId) : null;

  // Trigger GSAP animations
  useEffect(() => {
    if (expandedDrive && copyPosition && !isCollapsing) {
      // Start expand animation
      animateToCenter();
    }
  }, [expandedDrive, copyPosition, isCollapsing, animateToCenter]);

  useEffect(() => {
    if (isCollapsing && copyRef.current) {
      // Start collapse animation
      animateToOriginal();
    }
  }, [isCollapsing, animateToOriginal]);

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
            <ExpandableDriveCard
                drive={expandedDrive}
                onBrowse={onBrowse}
                onShare={onShare}
                onDelete={onDelete}
                isExpanded={false} // Keep collapsed throughout animation
                isAnimating={false}
                isPending={false}
                onExpandChange={() => {}} // Disable internal expand handling
                onExpandComplete={() => {}}
                onCollapseComplete={() => {}}
                className="w-full h-full"
              />
          </div>
        )}
      </AnimatePresence>

      {/* Static 3-column grid */}
      <div className="w-full p-4 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {drives.map((drive) => (
            <div
              key={drive.id}
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
                  onClick={() => handleExpandChange(drive.id, true)}
                >
                  <ExpandableDriveCard
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
          ))}
        </div>
      </div>
    </div>
  );
}
