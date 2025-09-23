"use client";
import { cn } from "../../renderer/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

export function Sidebar({ open, setOpen, children, className }: SidebarProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={false}
        animate={{
          width: open ? "16rem" : "4rem",
          transition: {
            duration: 0.5,
            ease: [0.4, 0.0, 0.2, 1],
          },
        }}
        className={cn(
          "relative hidden h-full flex-col border-r border-neutral-700/30 bg-black/5 md:flex",
          className
        )}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

interface SidebarBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function SidebarBody({ children, className }: SidebarBodyProps) {
  return (
    <div className={cn("flex h-full flex-col p-4", className)}>
      {children}
    </div>
  );
}

interface SidebarLinkProps {
  link: {
    label: string;
    href: string;
    icon: React.ReactNode;
    isActive?: boolean;
  };
  className?: string;
}

export function SidebarLink({ link, className }: SidebarLinkProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <a
      href={link.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        link.isActive
          ? "bg-neutral-700 text-white"
          : "text-neutral-400 hover:bg-neutral-700 hover:text-white",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div
        animate={{
          scale: isHovered ? 1.1 : 1,
        }}
        transition={{
          duration: 0.2,
        }}
      >
        {link.icon}
      </motion.div>
      <AnimatePresence>
        {link.label && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2 }}
            className="whitespace-nowrap"
          >
            {link.label}
          </motion.span>
        )}
      </AnimatePresence>
    </a>
  );
}

interface SidebarToggleProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  className?: string;
}

export function SidebarToggle({ open, setOpen, className }: SidebarToggleProps) {
  return (
    <button
      onClick={() => setOpen(!open)}
      className={cn(
        "fixed left-4 top-4 z-50 rounded-lg bg-neutral-800 p-2 shadow-lg transition-colors hover:bg-neutral-700 text-white",
        className
      )}
    >
      <motion.div
        animate={{ rotate: open ? 180 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 15 15"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
        >
          <path
            d="M1.5 3C1.22386 3 1 3.22386 1 3.5C1 3.77614 1.22386 4 1.5 4H13.5C13.7761 4 14 3.77614 14 3.5C14 3.22386 13.7761 3 13.5 3H1.5ZM1 7.5C1 7.22386 1.22386 7 1.5 7H13.5C13.7761 7 14 7.22386 14 7.5C14 7.77614 13.7761 8 13.5 8H1.5C1.22386 8 1 7.77614 1 7.5ZM1 11.5C1 11.2239 1.22386 11 1.5 11H13.5C13.7761 11 14 11.2239 14 11.5C14 11.7761 13.7761 12 13.5 12H1.5C1.22386 12 1 11.7761 1 11.5Z"
            fill="currentColor"
            fillRule="evenodd"
            clipRule="evenodd"
          />
        </svg>
      </motion.div>
    </button>
  );
}