"use client";
import { useState } from "react";
import { FileUpload } from "./file-upload";
import { cn } from "../../renderer/lib/utils";
import { motion } from "motion/react";

interface DropzoneProps {
  onFileUpload: (files: File[]) => void;
  className?: string;
}

export function Dropzone({ onFileUpload, className }: DropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileUpload = (files: File[]) => {
    onFileUpload(files);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "w-full",
        className
      )}
    >
      <div className="p-1">
        <div className="max-w-4xl mx-auto">
          <div className="border border-dashed border-neutral-700/50 rounded-lg">
            <FileUpload onChange={handleFileUpload} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
