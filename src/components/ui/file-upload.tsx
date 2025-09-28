import { cn } from "../../renderer/lib/utils";
import * as React from "react";
import { useRef, useState, useCallback } from "react";
import { motion } from "motion/react";
import { IconUpload } from "@tabler/icons-react";
import { useDropzone } from "react-dropzone";

// File System Access API types
declare global {
  interface FileSystemDirectoryHandle {
    readonly kind: 'directory';
    readonly name: string;
    entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
    getFileHandle(name: string): Promise<FileSystemFileHandle>;
    getDirectoryHandle(name: string): Promise<FileSystemDirectoryHandle>;
  }
  
  interface FileSystemFileHandle {
    readonly kind: 'file';
    readonly name: string;
    getFile(): Promise<File>;
  }
  
  interface FileSystemHandle {
    readonly kind: 'file' | 'directory';
    readonly name: string;
  }
  
  interface DataTransferItem {
    readonly kind: string;
    getAsFileSystemHandle(): Promise<FileSystemHandle | null>;
  }
}

interface FileWithPath {
  file: File;
  relativePath: string;
  folderName: string;
}

const mainVariant = {
  initial: {
    x: 0,
    y: 0,
  },
  animate: {
    x: 20,
    y: -20,
    opacity: 0.9,
  },
};

const secondaryVariant = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
  },
};

export const FileUpload = ({
  onChange,
}: {
  onChange?: (files: File[]) => void;
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (newFiles: File[]) => {
    setFiles((prevFiles) => [...prevFiles, ...newFiles]);
    onChange && onChange(newFiles);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  // Custom drag and drop handlers for folder detection
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    // Get the dropped files first
    const droppedFiles = Array.from(e.dataTransfer.files);
    console.log('[Drag Drop Debug] Dropped files:', droppedFiles.map(f => ({ 
      name: f.name, 
      webkitPath: f.webkitRelativePath,
      size: f.size,
      type: f.type
    })));

    // Separate individual files from folder files
    const individualFiles: File[] = [];
    const folderFiles: File[] = [];

    // Check each file to see if it's from a folder or individual
    for (const file of droppedFiles) {
      if (file.webkitRelativePath && file.webkitRelativePath.includes('/')) {
        // This file is from a folder drag
        folderFiles.push(file);
      } else {
        // Check if this is a folder entry (usually has no type and small size)
        // Also check if the name matches any folder names from File System Access API
        const isFolderEntry = !file.type && (file.size === 0 || file.size < 1000);
        
        if (isFolderEntry) {
          console.log('[Drag Drop Debug] Skipping potential folder entry:', file.name, { size: file.size, type: file.type });
          // Skip folder entries - they'll be handled by File System Access API
        } else {
          // This is an individual file
          individualFiles.push(file);
        }
      }
    }
    
    console.log('[Drag Drop Debug] After initial separation:', {
      individualFiles: individualFiles.length,
      folderFiles: folderFiles.length
    });

    // Always try File System Access API first to get proper folder structure
    if ('showDirectoryPicker' in window) {
      try {
        // Try to get directory handle from the drop event
        const items = Array.from(e.dataTransfer.items);
        const directoryHandles = [];

        for (const item of items) {
          if (item.kind === 'file') {
            try {
              const handle = await item.getAsFileSystemHandle();
              if (handle && handle.kind === 'directory') {
                directoryHandles.push(handle);
              }
            } catch (itemError) {
              // Continue with other items
            }
          }
        }

        if (directoryHandles.length > 0) {
          // Process directory handles and add to folder files
          const additionalFolderFiles = await processDirectoryHandles(directoryHandles);
          console.log('[Drag Drop Debug] File System Access API added files:', additionalFolderFiles.map(f => ({
            name: f.name,
            webkitPath: f.webkitRelativePath
          })));
          folderFiles.push(...additionalFolderFiles);
          
          // If we got folder files from File System Access API, we need to be more careful
          // about which individual files to keep - only keep true individual files, not folder entries
          if (additionalFolderFiles.length > 0) {
            console.log('[Drag Drop Debug] File System Access API provided folder files, checking individual files');
            
            // Filter out individual files that might be folder entries
            const trueIndividualFiles = individualFiles.filter(file => {
              // Keep files that have a proper type and reasonable size
              const isRealFile = file.type && file.size > 0;
              if (!isRealFile) {
                console.log('[Drag Drop Debug] Filtering out potential folder entry:', file.name);
              }
              return isRealFile;
            });
            
            console.log('[Drag Drop Debug] Kept individual files:', trueIndividualFiles.length);
            individualFiles.length = 0;
            individualFiles.push(...trueIndividualFiles);
          }
        }
      } catch (error) {
        console.log('[Drag Drop Debug] File System Access API error:', error);
        // Fall through to regular file handling
      }
    }

    // Combine all files for upload
    const allFiles = [...individualFiles, ...folderFiles];
    
    console.log('[Drag Drop Debug] Final files to upload:', {
      totalFiles: allFiles.length,
      individualFiles: individualFiles.length,
      folderFiles: folderFiles.length,
      files: allFiles.map(f => ({ name: f.name, webkitPath: f.webkitRelativePath }))
    });
    
    if (allFiles.length > 0) {
      handleFileChange(allFiles);
    }
  }, []);

  const processDirectoryHandles = async (handles: FileSystemDirectoryHandle[]): Promise<File[]> => {
    const allFilesWithPath: FileWithPath[] = [];
    
    for (const handle of handles) {
      const files = await getFilesFromDirectory(handle, '', handle.name);
      allFilesWithPath.push(...files);
    }
    
    if (allFilesWithPath.length > 0) {
      // Convert FileWithPath back to File objects with webkitRelativePath
      const files: File[] = allFilesWithPath.map(fwp => {
        const file = fwp.file;
        // Create a new File object with the webkitRelativePath
        const newFile = new File([file], file.name, { type: file.type, lastModified: file.lastModified });
        // Add the webkitRelativePath as a non-enumerable property
        const webkitPath = `${fwp.folderName}/${fwp.relativePath}`;
        Object.defineProperty(newFile, 'webkitRelativePath', {
          value: webkitPath,
          writable: false,
          enumerable: false,
          configurable: false
        });
        return newFile;
      });
      
      return files;
    }
    
    return [];
  };

  const getFilesFromDirectory = async (dirHandle: FileSystemDirectoryHandle, path = '', rootFolderName = ''): Promise<FileWithPath[]> => {
    const files: FileWithPath[] = [];
    
    // Set root folder name on first call
    const currentRootFolderName = rootFolderName || dirHandle.name;

    for await (const [name, handle] of dirHandle.entries()) {
      if (handle.kind === 'file') {
        const fileHandle = handle as FileSystemFileHandle;
        const file = await fileHandle.getFile();
        // Create a wrapper object with the relative path
        const fileWithPath: FileWithPath = {
          file,
          relativePath: path ? `${path}/${name}` : name,
          folderName: currentRootFolderName
        };
        files.push(fileWithPath);
      } else if (handle.kind === 'directory') {
        const dirHandle = handle as FileSystemDirectoryHandle;
        const subFiles = await getFilesFromDirectory(dirHandle, path ? `${path}/${name}` : name, currentRootFolderName);
        files.push(...subFiles);
      }
    }
    
    return files;
  };

  // Fallback to react-dropzone for click handling
  const { getRootProps } = useDropzone({
    multiple: true,
    noClick: true,
    onDrop: handleFileChange,
    onDropRejected: (error) => {
      // Handle drop rejection
    },
  });

  return (
    <div 
      className="w-full"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <motion.div
        onClick={handleClick}
        whileHover="animate"
        className="p-1 group/file block rounded-lg cursor-pointer w-full relative overflow-hidden"
      >
        <input
          ref={fileInputRef}
          id="file-upload-handle"
          type="file"
          multiple
          onChange={(e) => handleFileChange(Array.from(e.target.files || []))}
          className="hidden"
        />
        <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,white,transparent)]">
          <GridPattern />
        </div>
        <div className="flex flex-col items-center justify-center">
          <p className="relative z-20 font-sans font-bold text-neutral-700 dark:text-neutral-300 text-sm">
            Drag files or a folder
          </p>
          <p className="relative z-20 font-sans font-normal text-neutral-400 dark:text-neutral-400 text-xs mt-1">
            Drag or drop files or a folder here or click select files
          </p>
          <div className="relative w-full mt-2 max-w-xl mx-auto">
            {!files.length && (
              <motion.div
                layoutId="file-upload"
                variants={mainVariant}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 20,
                }}
                className={cn(
                  "relative group-hover/file:shadow-2xl z-40 bg-white dark:bg-neutral-900 flex items-center justify-center h-8 mt-1 w-full max-w-[4rem] mx-auto rounded-md",
                  "shadow-[0px_10px_50px_rgba(0,0,0,0.1)]"
                )}
              >
                {isDragActive ? (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-neutral-600 flex flex-col items-center"
                  >
                    Drop it
                    <IconUpload className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                  </motion.p>
                ) : (
                  <IconUpload className="h-4 w-4 text-neutral-600 dark:text-neutral-300" />
                )}
              </motion.div>
            )}

            {!files.length && (
              <motion.div
                variants={secondaryVariant}
                className="absolute opacity-0 border border-dashed border-sky-400 inset-0 z-30 bg-transparent flex items-center justify-center h-8 mt-1 w-full max-w-[4rem] mx-auto rounded-md"
              ></motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export function GridPattern() {
  const columns = 41;
  const rows = 11;
  return (
    <div className="flex bg-gray-100 dark:bg-neutral-900 shrink-0 flex-wrap justify-center items-center gap-x-px gap-y-px  scale-105">
      {Array.from({ length: rows }).map((_, row) =>
        Array.from({ length: columns }).map((_, col) => {
          const index = row * columns + col;
          return (
            <div
              key={`${col}-${row}`}
              className={`w-10 h-10 flex shrink-0 rounded-[2px] ${
                index % 2 === 0
                  ? "bg-gray-50 dark:bg-neutral-950"
                  : "bg-gray-50 dark:bg-neutral-950 shadow-[0px_0px_1px_3px_rgba(255,255,255,1)_inset] dark:shadow-[0px_0px_1px_3px_rgba(0,0,0,1)_inset]"
              }`}
            />
          );
        })
      )}
    </div>
  );
}
