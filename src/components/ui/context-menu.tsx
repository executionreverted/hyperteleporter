"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../renderer/lib/utils";
import { 
  IconEdit, 
  IconTrash, 
  IconCopy, 
  IconCut, 
  IconPaste, 
  IconDownload, 
  IconShare, 
  IconFolderPlus,
  IconFilePlus,
  IconEye,
  IconEyeOff
} from "@tabler/icons-react";

export interface ContextMenuAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

interface ContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  actions: ContextMenuAction[];
  onClose: () => void;
  className?: string;
}

export function ContextMenu({ isOpen, position, actions, onClose, className }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className={cn(
          "fixed z-50 min-w-[200px] bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl",
          "backdrop-blur-sm bg-black/80",
          className
        )}
        style={{
          left: position.x,
          top: position.y,
        }}
      >
        <div className="py-2">
          {actions.map((action, index) => (
            <button
              key={action.id}
              onClick={() => {
                action.onClick();
                onClose();
              }}
              disabled={action.disabled}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors",
                "hover:bg-black/20 focus:bg-black/20 focus:outline-none",
                action.disabled && "opacity-50 cursor-not-allowed",
                action.destructive && "text-red-400 hover:text-red-300 hover:bg-red-900/20",
                !action.destructive && "text-neutral-300 hover:text-white"
              )}
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Hook for managing context menu state
export function useContextMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const openContextMenu = (event: React.MouseEvent, actions: ContextMenuAction[]) => {
    event.preventDefault();
    event.stopPropagation();
    
    const x = event.clientX;
    const y = event.clientY;
    
    // Adjust position if menu would go off screen
    const menuWidth = 200;
    const menuHeight = actions.length * 40 + 16; // Approximate height
    
    const adjustedX = x + menuWidth > window.innerWidth ? x - menuWidth : x;
    const adjustedY = y + menuHeight > window.innerHeight ? y - menuHeight : y;
    
    setPosition({ x: adjustedX, y: adjustedY });
    setIsOpen(true);
  };

  const closeContextMenu = () => {
    setIsOpen(false);
  };

  return {
    isOpen,
    position,
    openContextMenu,
    closeContextMenu,
  };
}
