"use client";
import { cn } from "../../renderer/lib/utils";
import { TreeNode } from "./tree-view";
import { motion } from "motion/react";
import { MagicButton } from "../../renderer/src/components/common/MagicButton";
import { 
  IconPhoto, 
  IconVideo, 
  IconFileTypePdf, 
  IconFile, 
  IconFolder, 
  IconDownload, 
  IconShare, 
  IconTrash 
} from "@tabler/icons-react";

interface ContentPanelProps {
  selectedNode?: TreeNode;
  onFileClick?: (node: TreeNode) => void;
  className?: string;
}

const FilePreview = ({ node }: { node: TreeNode }) => {
  const getFileType = () => {
    const extension = node.name.split('.').pop()?.toLowerCase();
    return extension || 'unknown';
  };

  const fileType = getFileType();

  const renderPreview = () => {
    switch (fileType) {
      case 'txt':
      case 'md':
        return (
          <div className="p-6">
            <div className="bg-gray-100 dark:bg-black/10 rounded-lg p-4 font-mono text-sm max-h-[480px] overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-neutral-800">
              <div className="text-gray-500 mb-2">Preview content:</div>
              <div className="whitespace-pre-wrap">
                {`This is a preview of the text file "${node.name}".

Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

Ut enim ad minim veniam, quis nostrud exercitation ullamco 
laboris nisi ut aliquip ex ea commodo consequat.`}
              </div>
            </div>
          </div>
        );

      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return (
          <div className="p-6">
            <div className="bg-gray-100 dark:bg-black/10 rounded-lg p-4 max-h-[480px] overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-neutral-800">
              <div className="text-gray-500 mb-4">Image Preview:</div>
              <div className="bg-white dark:bg-neutral-700 rounded-lg p-8 flex items-center justify-center max-h-[400px]">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-300 dark:bg-neutral-600 rounded-lg mx-auto mb-4 flex items-center justify-center">
                    <IconPhoto size={32} className="text-gray-500" />
                  </div>
                  <p className="text-sm text-gray-500">Image preview would appear here</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'mp4':
      case 'avi':
      case 'mov':
      case 'mkv':
        return (
          <div className="p-6">
            <div className="bg-gray-100 dark:bg-black/10 rounded-lg p-4 max-h-[480px] overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-neutral-800">
              <div className="text-gray-500 mb-4">Video Preview:</div>
              <div className="bg-black rounded-lg p-8 flex items-center justify-center max-h-[400px]">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-700 rounded-lg mx-auto mb-4 flex items-center justify-center">
                    <IconVideo size={32} className="text-white" />
                  </div>
                  <p className="text-sm text-gray-300">Video preview would appear here</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'pdf':
        return (
          <div className="p-6">
            <div className="bg-gray-100 dark:bg-black/10 rounded-lg p-4 max-h-[480px] overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-neutral-800">
              <div className="text-gray-500 mb-4">PDF Preview:</div>
              <div className="bg-white dark:bg-neutral-700 rounded-lg p-8 flex items-center justify-center max-h-[400px]">
                <div className="text-center">
                  <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-lg mx-auto mb-4 flex items-center justify-center">
                    <IconFileTypePdf size={32} className="text-red-500" />
                  </div>
                  <p className="text-sm text-gray-500">PDF preview would appear here</p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="p-6">
            <div className="bg-gray-100 dark:bg-black/10 rounded-lg p-4 max-h-[480px] overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-neutral-800">
              <div className="text-gray-500 mb-4">File Preview:</div>
              <div className="bg-white dark:bg-neutral-700 rounded-lg p-8 flex items-center justify-center max-h-[400px]">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-300 dark:bg-neutral-600 rounded-lg mx-auto mb-4 flex items-center justify-center">
                    <IconFile size={32} className="text-gray-500" />
                  </div>
                  <p className="text-sm text-gray-500">Preview not available for this file type</p>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {renderPreview()}
    </motion.div>
  );
};

const FileMetadata = ({ node }: { node: TreeNode }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-6"
    >
      <div className="bg-black/10 rounded-lg p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white mb-4">
            File Information
          </h3>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-neutral-400">Name:</span>
            <span className="text-white font-medium">{node.name}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-neutral-400">Type:</span>
            <span className="text-white font-medium">
              {node.type === 'folder' ? 'Folder' : 'File'}
            </span>
          </div>
          
          {node.size && (
            <div className="flex justify-between">
              <span className="text-neutral-400">Size:</span>
              <span className="text-white font-medium">{node.size}</span>
            </div>
          )}
          
          {node.modified && (
            <div className="flex justify-between">
              <span className="text-neutral-400">Modified:</span>
              <span className="text-white font-medium">{node.modified}</span>
            </div>
          )}
          
          <div className="flex justify-between">
            <span className="text-neutral-400">Created:</span>
            <span className="text-white font-medium">
              {new Date().toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const FolderContents = ({ node, onFileClick }: { node: TreeNode; onFileClick?: (node: TreeNode) => void }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-6"
    >
      <div className="bg-black/10 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Folder Contents
        </h3>
        
        {node.children && node.children.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {node.children.map((child) => (
              <div
                key={child.id}
                className="bg-black/10 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer hover:bg-black/20"
                onClick={() => onFileClick?.(child)}
              >
                <div className="flex items-center gap-3 mb-2">
                  {child.type === 'folder' ? (
                    <IconFolder size={20} className="text-blue-500" />
                  ) : (
                    <IconFile size={20} className="text-neutral-400" />
                  )}
                  <span className="font-medium text-white truncate">
                    {child.name}
                  </span>
                </div>
                {child.size && (
                  <p className="text-sm text-neutral-400">{child.size}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-black/20 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <IconFolder size={32} className="text-neutral-400" />
            </div>
            <p className="text-neutral-400">This folder is empty</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export function ContentPanel({ selectedNode, onFileClick, className }: ContentPanelProps) {
  if (!selectedNode) {
    return (
      <div className={cn("flex items-center justify-center h-full", className)}>
      <div className="text-center">
        <div className="w-16 h-16 bg-black/20 rounded-lg mx-auto mb-4 flex items-center justify-center">
          <IconFolder size={32} className="text-neutral-400" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">
          Select a file or folder
        </h3>
        <p className="text-neutral-400">
          Choose an item from the sidebar to view its contents or preview
        </p>
      </div>
      </div>
    );
  }

  return (
    <div className={cn("h-full overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-neutral-800 bg-black/5", className)}>
      {/* Actions Header - only for files */}
      {selectedNode.type === 'file' && (
        <div className="sticky top-0 z-10 bg-black/5 backdrop-blur-sm border-b border-neutral-700/30 p-4">
          <div className="flex justify-end">
            <div className="flex gap-2">
              <MagicButton className="text-sm flex items-center gap-2">
                <IconDownload size={16} />
                Download
              </MagicButton>
              <MagicButton className="text-sm flex items-center gap-2">
                <IconShare size={16} />
                Share
              </MagicButton>
              <MagicButton className="text-sm flex items-center gap-2">
                <IconTrash size={16} />
                Delete
              </MagicButton>
            </div>
          </div>
        </div>
      )}
      
      {selectedNode.type === 'folder' ? (
        <FolderContents node={selectedNode} onFileClick={onFileClick} />
      ) : (
        <>
          <FilePreview node={selectedNode} />
          <FileMetadata node={selectedNode} />
        </>
      )}
    </div>
  );
}
