"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

// Custom tooltip wrapper with 2-second delay and smart positioning
export const DelayedTooltip = ({ 
  children, 
  description 
}: { 
  children: React.ReactNode; 
  description: string; 
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const buttonRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    const id = setTimeout(() => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const centerX = window.innerWidth / 2;
        const buttonCenterX = rect.left + rect.width / 2;
        
        // Calculate tooltip position
        const isLeftSide = buttonCenterX < centerX;
        const tooltipX = isLeftSide 
          ? rect.right + 8 // Show to the right
          : rect.left - 8; // Show to the left
        const tooltipY = rect.top + rect.height / 2; // Center vertically
        
        setTooltipStyle({
          position: 'fixed',
          left: isLeftSide ? tooltipX : undefined,
          right: isLeftSide ? undefined : window.innerWidth - tooltipX,
          top: tooltipY,
          transform: 'translateY(-50%)',
          zIndex: 9999,
        });
      }
      setShowTooltip(true);
    }, 2000); // 2 second delay
    setTimeoutId(id);
  };

  const handleMouseLeave = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    setShowTooltip(false);
  };

  return (
    <div 
      ref={buttonRef}
      onMouseEnter={handleMouseEnter} 
      onMouseLeave={handleMouseLeave} 
      className="relative"
    >
      {children}
      {showTooltip && createPortal(
        <div 
          style={tooltipStyle}
          className="flex flex-col items-center justify-center rounded-md bg-black px-4 py-2 text-xs shadow-xl whitespace-nowrap"
        >
          <div className="absolute inset-x-10 -bottom-px z-30 h-px w-[20%] bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
          <div className="absolute -bottom-px left-10 z-30 h-px w-[40%] bg-gradient-to-r from-transparent via-sky-500 to-transparent" />
          <div className="relative z-30 text-sm text-white text-center leading-relaxed">{description}</div>
        </div>,
        document.body
      )}
    </div>
  );
};
