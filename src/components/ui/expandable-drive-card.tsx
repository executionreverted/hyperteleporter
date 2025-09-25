"use client"

import * as React from "react";
import { useState, useCallback, useMemo } from "react";
import { 
  Expandable, 
  ExpandableCard, 
  ExpandableCardHeader, 
  ExpandableCardContent, 
  ExpandableCardFooter, 
  ExpandableContent, 
  ExpandableTrigger 
} from "./expandable";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "../../renderer/lib/utils";
import { 
  IconCalendar, 
  IconClock, 
  IconKey, 
  IconShare, 
  IconTrash,
  IconDeviceUsb as IconHardDrive,
  IconActivity
} from "@tabler/icons-react";
import FolderOpenIcon from "../../renderer/src/assets/folder-open.svg";
import { MagicButton } from "../../renderer/src/components/common/MagicButton";
import MagicButtonWide from "./magic-button-wide";
import diskSvg from "../../renderer/src/assets/disk.svg";
import Masonry from "./masonry";

export interface Drive {
  id: string;
  title: string;
  description: string;
  link: string;
  createdAt: Date;
  size?: string;
  status: 'active' | 'inactive' | 'syncing';
  lastAccessed?: Date;
  driveKey?: string;
}

interface ExpandableDriveCardProps {
  drive: Drive;
  onBrowse?: (drive: Drive) => void;
  onShare?: (drive: Drive) => void;
  onDelete?: (drive: Drive) => void;
  className?: string;
  isExpanded?: boolean;
  isAnimating?: boolean;
  isPending?: boolean;
  onExpandChange?: (expanded: boolean) => void;
  onExpandComplete?: () => void;
  onCollapseComplete?: () => void;
  customSizes?: {
    collapsedSize?: { width?: number; height?: number };
    expandedSize?: { width?: number; height?: number };
  };
}

export function ExpandableDriveCard({ 
  drive, 
  onBrowse, 
  onShare, 
  onDelete, 
  className,
  isExpanded: controlledExpanded,
  isAnimating = false,
  isPending = false,
  onExpandChange,
  onExpandComplete,
  onCollapseComplete,
  customSizes
}: ExpandableDriveCardProps) {

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getStatusColor = (status: Drive['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'syncing':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'inactive':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusText = (status: Drive['status']) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'syncing':
        return 'Syncing';
      case 'inactive':
        return 'Inactive';
      default:
        return 'Unknown';
    }
  };

  return (
    <div
      className={cn(
        "relative group block p-2 cursor-pointer transition-all duration-300 ease-in-out",
        className
      )}
    >
      {/* Hover effect positioned relative to the outer container */}
      
      <Expandable
        expandDirection="vertical"
        expandBehavior="replace"
        initialDelay={0.1}
        expanded={controlledExpanded}
        onToggle={() => {
          // Prevent clicks during animation
          if (isAnimating) {
            return;
          }
          onExpandChange?.(!controlledExpanded);
        }}
      >
        {({ isExpanded }) => (
          <ExpandableTrigger>
            <ExpandableCard
              className="w-full relative"
              collapsedSize={customSizes?.collapsedSize || { width: undefined, height: 200 }}
              expandedSize={customSizes?.expandedSize || { width: undefined, height: 400 }}
              hoverToExpand={false}
              onExpandComplete={onExpandComplete}
              onCollapseComplete={onCollapseComplete}
            >
              <div
                className={cn(
                  "rounded-2xl h-full w-full overflow-hidden border border-transparent dark:border-white/[0.2] relative flex flex-col",
                  "transition-all duration-200 ease-out",
                  isExpanded ? "z-50 shadow-2xl" : "z-20 shadow-lg", // Higher z-index and shadow when expanded
                  isAnimating && "pointer-events-none opacity-75", // Disable interactions during animation
                  isPending && "ring-2 ring-blue-400 ring-opacity-50" // Visual feedback for pending expansion (no pulse to avoid flickering)
                )}
                style={{
                  backgroundImage: `url(${diskSvg})`,
                  backgroundSize: '80%',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                }}
              >
                {/* Background overlay with B&W filter and low opacity */}
                <div 
                  className="absolute inset-0 bg-black/40"
                  style={{
                    filter: 'grayscale(100%)',
                    mixBlendMode: 'multiply',
                  }}
                />
                
                <div className="relative z-50 flex flex-col h-full p-4">
                  <ExpandableCardHeader className="p-0">
                    <div className="flex justify-between items-start w-full">
                      <div className="flex-1">
                        <div className={cn(
                          "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mb-2 border",
                          getStatusColor(drive.status)
                        )}>
                          <IconActivity className="h-3 w-3 mr-1" />
                          {getStatusText(drive.status)}
                        </div>
                        <h4 
                          className="text-zinc-100 font-bold tracking-wide text-sm leading-tight mb-2"
                          style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {drive.title}
                        </h4>
                        <p
                          className="text-zinc-400 tracking-wide leading-relaxed text-xs flex-1"
                          style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {drive.description}
                        </p>
                      </div>
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 backdrop-blur-sm ml-2">
                        <IconHardDrive className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  </ExpandableCardHeader>

                  <ExpandableCardContent className="p-0 pt-2 flex-1">
                    <div className="flex flex-col space-y-3">
                      {/* Drive Size and Basic Info */}
                      <div className="flex items-center text-sm text-zinc-400">
                        <IconHardDrive className="h-4 w-4 mr-2" />
                        <span>{drive.size || 'Unknown size'}</span>
                      </div>

                      {/* Expandable Content - Drive Details */}
                      <ExpandableContent preset="fade" stagger staggerChildren={0.1}>
                        <div className="space-y-2">
                          {/* Creation Date */}
                          <div className="flex items-center text-sm text-zinc-400">
                            <IconCalendar className="h-4 w-4 mr-2" />
                            <span>Created: {formatDate(drive.createdAt)}</span>
                          </div>

                          {/* Last Accessed */}
                          {drive.lastAccessed && (
                            <div className="flex items-center text-sm text-zinc-400">
                              <IconClock className="h-4 w-4 mr-2" />
                              <span>Last accessed: {formatDate(drive.lastAccessed)}</span>
                            </div>
                          )}

                          {/* Drive Key */}
                          {drive.driveKey && (
                            <div className="flex items-center text-sm text-zinc-400">
                              <IconKey className="h-4 w-4 mr-2" />
                              <span className="font-mono text-xs bg-black/20 px-2 py-1 rounded">
                                {drive.driveKey}
                              </span>
                            </div>
                          )}
                        </div>
                      </ExpandableContent>

                      {/* Action Buttons */}
                      <ExpandableContent preset="slide-up" stagger staggerChildren={0.1}>
                        <div className="space-y-2 pt-2">
                          <MagicButton 
                            variant="blue"
                            className="w-full h-10"
                            onClick={() => {
                              onBrowse?.(drive);
                            }}
                          >
                            <div className="flex items-center justify-center gap-2">
                              <img src={FolderOpenIcon} alt="Browse Drive" className="h-4 w-4" />
                              Browse Drive
                            </div>
                          </MagicButton>
                          
                          {isExpanded && (
                            <div className="grid grid-cols-2 gap-2 mb-4">
                              <MagicButtonWide 
                                variant="green"
                                className="w-full"
                                onClick={() => {
                                  onShare?.(drive);
                                }}
                              >
                                <div className="flex items-center justify-center gap-2">
                                  <IconShare className="h-4 w-4" />
                                  Share
                                </div>
                              </MagicButtonWide>
                              <MagicButtonWide 
                                variant="red"
                                className="w-full"
                                onClick={() => {
                                  onDelete?.(drive);
                                }}
                              >
                                <div className="flex items-center justify-center gap-2">
                                  <IconTrash className="h-4 w-4" />
                                  Delete
                                </div>
                              </MagicButtonWide>
                            </div>
                          )}
                        </div>
                      </ExpandableContent>
                    </div>
                  </ExpandableCardContent>

                  {/* Footer with additional info */}
                  <ExpandableContent preset="slide-up">
                    <div className="flex items-center justify-between w-full text-sm text-zinc-500 pt-2 border-t border-zinc-700/50">
                      <span>ID: {drive.id.slice(-8)}</span>
                      <span className="text-xs">{isExpanded ? 'Click to collapse' : 'Click to expand'}</span>
                    </div>
                  </ExpandableContent>
                </div>
              </div>
            </ExpandableCard>
          </ExpandableTrigger>
        )}
      </Expandable>
    </div>
  );
}

// Grid component for displaying multiple drive cards
interface ExpandableDriveGridProps {
  drives: Drive[];
  onBrowse?: (drive: Drive) => void;
  onShare?: (drive: Drive) => void;
  onDelete?: (drive: Drive) => void;
  className?: string;
}

export function ExpandableDriveGrid({ 
  drives, 
  onBrowse, 
  onShare, 
  onDelete, 
  className 
}: ExpandableDriveGridProps) {
  const [expandedDriveId, setExpandedDriveId] = useState<string | null>(null);

  return (
    <div className={cn(
      "flex flex-wrap gap-4 py-10",
      className
    )}>
      {drives.map((drive) => (
        <ExpandableDriveCard
          key={drive.id}
          drive={drive}
          onBrowse={onBrowse}
          onShare={onShare}
          onDelete={onDelete}
          isExpanded={expandedDriveId === drive.id}
          onExpandChange={(expanded) => {
            setExpandedDriveId(expanded ? drive.id : null);
          }}
          className={cn(
            "w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.67rem)] xl:w-[calc(25%-0.75rem)]",
            expandedDriveId === drive.id && "sm:w-[calc(100%-1rem)] lg:w-[calc(66.666%-1.33rem)] xl:w-[calc(50%-1.5rem)]"
          )}
        />
      ))}
    </div>
  );
}

// Custom Masonry grid for drives
export function DynamicDriveGrid({ 
  drives, 
  onBrowse, 
  onShare, 
  onDelete, 
  className 
}: ExpandableDriveGridProps) {
  const [expandedDriveId, setExpandedDriveId] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [pendingExpandId, setPendingExpandId] = useState<string | null>(null);

  // Enhanced expand handler with single-expand behavior
  const handleExpandChange = useCallback((driveId: string, expanded: boolean) => {
    // If we're already animating, ignore the click
    if (isAnimating) {
      return;
    }

    if (expanded) {
      // If clicking to expand a drive
      if (expandedDriveId && expandedDriveId !== driveId) {
        // If another drive is already expanded, collapse it first
        setIsAnimating(true);
        setExpandedDriveId(null); // Collapse current
        setPendingExpandId(driveId); // Remember which one to expand next
        
        // After collapse completes, expand the new one
        setTimeout(() => {
          setExpandedDriveId(driveId);
          setPendingExpandId(null);
          // Allow masonry to rearrange after a short delay
          setTimeout(() => {
            setIsAnimating(false);
          }, 100);
        }, 1000); // Wait 1 second for collapse animation to complete
      } else {
        // No other drive expanded, expand immediately
        setExpandedDriveId(driveId);
      }
    } else {
      // Collapsing current drive
      setIsAnimating(true);
      setExpandedDriveId(null);
      
      // Set a timeout to automatically allow masonry rearrangement for collapse
      setTimeout(() => {
        setIsAnimating(false);
      }, 300); // 300ms should be enough for most collapse animations
    }
  }, [expandedDriveId, isAnimating]);

  // Handle animation completion with faster response
  const handleExpandComplete = useCallback(() => {
    // No need to set isAnimating to false for expand since we don't block masonry on expand
    // The masonry can rearrange immediately when expanding
  }, []);

  const handleCollapseComplete = useCallback(() => {
    // Immediately allow masonry rearrangement when collapse animation completes
    setIsAnimating(false);
  }, []);

  // Transform drives to match Masonry component format
  const masonryItems = useMemo(() => drives.map(drive => ({
    id: drive.id,
    img: diskSvg, // Use the disk SVG as background
    height: expandedDriveId === drive.id ? 400 : 200, // Dynamic height based on expansion
    url: drive.link,
    drive: drive, // Keep original drive data
    onBrowse,
    onShare,
    onDelete,
    isExpanded: expandedDriveId === drive.id,
    isAnimating: isAnimating, // Pass animation state to prevent clicks
    isPending: pendingExpandId === drive.id, // Show pending state
    onExpandChange: (expanded: boolean) => {
      handleExpandChange(drive.id, expanded);
    },
    onExpandComplete: handleExpandComplete,
    onCollapseComplete: handleCollapseComplete
  })), [drives, expandedDriveId, isAnimating, pendingExpandId, onBrowse, onShare, onDelete, handleExpandChange, handleExpandComplete, handleCollapseComplete]);

  // Memoize the Masonry component props to prevent unnecessary re-renders
  const masonryProps = useMemo(() => ({
    items: masonryItems,
    ease: "power2.out" as const,
    duration: 0.3, // Even faster for better performance
    stagger: 0.01, // Minimal stagger
    animateFrom: "bottom" as const,
    scaleOnHover: false,
    blurToFocus: false,
    colorShiftOnHover: false,
    isAnimating // Pass animation state to masonry
  }), [masonryItems, isAnimating]);

  return (
    <div className={cn("w-full", className)}>
      <div className="w-full p-4 pb-8">
        <Masonry {...masonryProps} />
      </div>
    </div>
  );
}
