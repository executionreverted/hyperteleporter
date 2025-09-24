"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../renderer/lib/utils";
import { 
  IconEdit, 
  IconTrash, 
  IconCopy, 
  IconCut, 
  IconDownload, 
  IconClipboard, 
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
          "fixed z-[9999] min-w-[200px] rounded-lg shadow-2xl",
          "relative overflow-hidden p-[1px]",
          className
        )}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          position: 'fixed',
        }}
      >
        {/* Magic Button Border Effect */}
        <span className="absolute inset-[-1000%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
        
        {/* Inner Content - covers the gradient to create border effect */}
        <div className="relative bg-black/80 backdrop-blur-xl rounded-lg h-full w-full">
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
                  "w-full flex items-center gap-3 px-4 py-2 text-sm transition-all duration-200",
                  "hover:bg-white/10 focus:bg-white/10 focus:outline-none",
                  "backdrop-blur-sm hover:backdrop-blur-md",
                  action.disabled && "opacity-50 cursor-not-allowed",
                  action.destructive && "text-red-400 hover:text-red-300 hover:bg-red-500/20",
                  !action.destructive && "text-white/90 hover:text-white hover:bg-white/5"
                )}
              >
                {action.icon}
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Hook for managing context menu state
export function useContextMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [actions, setActions] = useState<ContextMenuAction[]>([]);

  const openContextMenu = (event: React.MouseEvent, menuActions: ContextMenuAction[]) => {
    event.preventDefault();
    event.stopPropagation();
    
    const x = event.clientX;
    const y = event.clientY;
    
    // Adjust position if menu would go off screen
    const menuWidth = 200;
    const menuHeight = menuActions.length * 40 + 16; // Approximate height
    
    const adjustedX = x + menuWidth > window.innerWidth ? x - menuWidth : x;
    const adjustedY = y + menuHeight > window.innerHeight ? y - menuHeight : y;
    
    setActions(menuActions);
    setPosition({ x: Math.max(0, adjustedX), y: Math.max(0, adjustedY) });
    setIsOpen(true);
  };

  const closeContextMenu = () => {
    setIsOpen(false);
    setActions([]);
  };

  return {
    isOpen,
    position,
    actions,
    openContextMenu,
    closeContextMenu,
  };
}
