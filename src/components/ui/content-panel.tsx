"use client";
import { cn } from "../../renderer/lib/utils";
import { TreeNode } from "./tree-view";
import { motion } from "motion/react";
import { MagicButton } from "../../renderer/src/components/common/MagicButton";

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
            <div className="bg-gray-100 dark:bg-black/10 rounded-lg p-4 font-mono text-sm">
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
            <div className="bg-gray-100 dark:bg-black/10 rounded-lg p-4">
              <div className="text-gray-500 mb-4">Image Preview:</div>
              <div className="bg-white dark:bg-neutral-700 rounded-lg p-8 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-300 dark:bg-neutral-600 rounded-lg mx-auto mb-4 flex items-center justify-center">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-gray-500">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2" fill="none"/>
                      <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="2" fill="none"/>
                      <polyline points="21,15 16,10 5,21" stroke="currentColor" strokeWidth="2" fill="none"/>
                    </svg>
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
            <div className="bg-gray-100 dark:bg-black/10 rounded-lg p-4">
              <div className="text-gray-500 mb-4">Video Preview:</div>
              <div className="bg-black rounded-lg p-8 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-700 rounded-lg mx-auto mb-4 flex items-center justify-center">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-white">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" stroke="currentColor" strokeWidth="2" fill="none"/>
                      <polygon points="10,8 16,12 10,16" fill="currentColor"/>
                    </svg>
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
            <div className="bg-gray-100 dark:bg-black/10 rounded-lg p-4">
              <div className="text-gray-500 mb-4">PDF Preview:</div>
              <div className="bg-white dark:bg-neutral-700 rounded-lg p-8 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-lg mx-auto mb-4 flex items-center justify-center">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-red-500">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" fill="none"/>
                      <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" fill="none"/>
                    </svg>
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
            <div className="bg-gray-100 dark:bg-black/10 rounded-lg p-4">
              <div className="text-gray-500 mb-4">File Preview:</div>
              <div className="bg-white dark:bg-neutral-700 rounded-lg p-8 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-300 dark:bg-neutral-600 rounded-lg mx-auto mb-4 flex items-center justify-center">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-gray-500">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" fill="none"/>
                      <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" fill="none"/>
                    </svg>
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
        <h3 className="text-lg font-semibold text-white mb-4">
          File Information
        </h3>
        
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
        
        <div className="mt-6 pt-4 border-t border-neutral-700">
          <h4 className="text-sm font-medium text-white mb-4">
            Actions
          </h4>
          <div className="flex gap-3">
            <MagicButton className="text-sm">
              Download
            </MagicButton>
            <MagicButton className="text-sm">
              Share
            </MagicButton>
            <MagicButton className="text-sm">
              Delete
            </MagicButton>
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
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-blue-500">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" fill="currentColor"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-neutral-400">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" fill="none"/>
                    </svg>
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
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-neutral-400">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" fill="currentColor"/>
              </svg>
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
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-neutral-400">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" fill="currentColor"/>
          </svg>
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
    <div className={cn("h-full overflow-y-auto bg-black/5", className)}>
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
