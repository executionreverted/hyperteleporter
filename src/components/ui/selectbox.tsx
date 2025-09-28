"use client";
import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../renderer/lib/utils";
import { IconChevronDown, IconCheck } from "@tabler/icons-react";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectBoxProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  dropdownClassName?: string;
  optionClassName?: string;
}

export function SelectBox({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  disabled = false,
  className,
  triggerClassName,
  dropdownClassName,
  optionClassName,
}: SelectBoxProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [focusedIndex, setFocusedIndex] = React.useState(-1);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const selectedOption = options.find(option => option.value === value);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;

    switch (event.key) {
      case "Enter":
      case " ":
        event.preventDefault();
        if (isOpen && focusedIndex >= 0) {
          const option = options[focusedIndex];
          if (!option.disabled) {
            onChange(option.value);
            setIsOpen(false);
            setFocusedIndex(-1);
          }
        } else {
          setIsOpen(!isOpen);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setFocusedIndex(-1);
        triggerRef.current?.focus();
        break;
      case "ArrowDown":
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setFocusedIndex(prev => {
            const nextIndex = prev + 1;
            return nextIndex >= options.length ? 0 : nextIndex;
          });
        }
        break;
      case "ArrowUp":
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setFocusedIndex(prev => {
            const prevIndex = prev - 1;
            return prevIndex < 0 ? options.length - 1 : prevIndex;
          });
        }
        break;
    }
  };

  const handleOptionClick = (option: SelectOption) => {
    if (!option.disabled) {
      onChange(option.value);
      setIsOpen(false);
      setFocusedIndex(-1);
    }
  };

  return (
    <div className={cn("relative", className)}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={cn(
          "relative inline-flex h-8 w-full items-center justify-between rounded-lg border border-neutral-600 bg-neutral-800 px-3 py-1.5 text-sm text-white transition-all duration-200",
          "hover:bg-neutral-700 hover:border-neutral-500",
          "focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-neutral-800",
          triggerClassName
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={selectedOption?.label || placeholder}
      >
        <span className={cn(
          "truncate",
          !selectedOption && "text-neutral-400"
        )}>
          {selectedOption?.label || placeholder}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <IconChevronDown className="h-4 w-4 text-neutral-400 flex-shrink-0" />
        </motion.div>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={cn(
              "absolute z-50 mt-1 w-full min-w-[120px] rounded-lg shadow-2xl",
              "bg-black/80 backdrop-blur-xl border border-white/10",
              dropdownClassName
            )}
            role="listbox"
          >
            <div className="py-2">
              {options.map((option, index) => (
                <motion.button
                  key={option.value}
                  type="button"
                  disabled={option.disabled}
                  onClick={() => handleOptionClick(option)}
                  className={cn(
                    "relative flex w-full items-center justify-between px-3 py-2 text-sm transition-all duration-150",
                    "hover:bg-white/10 focus:bg-white/10 focus:outline-none",
                    "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent",
                    focusedIndex === index && "bg-white/10",
                    optionClassName
                  )}
                  role="option"
                  aria-selected={option.value === value}
                  onMouseEnter={() => setFocusedIndex(index)}
                >
                  <span className={cn(
                    "truncate",
                    option.disabled ? "text-neutral-500" : "text-white/90"
                  )}>
                    {option.label}
                  </span>
                  {option.value === value && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.15 }}
                    >
                      <IconCheck className="h-4 w-4 text-blue-400" />
                    </motion.div>
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
