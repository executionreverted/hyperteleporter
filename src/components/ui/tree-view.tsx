"use client";
import { cn } from "../../renderer/lib/utils";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

export interface TreeNode {
  id: string;
  name: string;
  type: 'folder' | 'file';
  children?: TreeNode[];
  size?: string;
  modified?: string;
  icon?: React.ReactNode;
  isSelected?: boolean;
}

interface TreeViewProps {
  data: TreeNode[];
  onNodeSelect?: (node: TreeNode) => void;
  onNodeToggle?: (node: TreeNode) => void;
  selectedNodeId?: string;
  expandedNodes?: Set<string>;
  className?: string;
}

interface TreeNodeProps {
  node: TreeNode;
  level: number;
  onNodeSelect?: (node: TreeNode) => void;
  onNodeToggle?: (node: TreeNode) => void;
  selectedNodeId?: string;
  expandedNodes?: Set<string>;
}

const FolderIcon = ({ isOpen }: { isOpen: boolean }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="text-blue-500"
  >
    {isOpen ? (
      <path
        d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
        fill="currentColor"
      />
    ) : (
      <path
        d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
        fill="currentColor"
      />
    )}
  </svg>
);

const FileIcon = ({ type }: { type: string }) => {
  const getFileIcon = () => {
    const extension = type.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'txt':
      case 'md':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-500">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" fill="none"/>
            <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" fill="none"/>
          </svg>
        );
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-green-500">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2" fill="none"/>
            <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="2" fill="none"/>
            <polyline points="21,15 16,10 5,21" stroke="currentColor" strokeWidth="2" fill="none"/>
          </svg>
        );
      case 'mp4':
      case 'avi':
      case 'mov':
      case 'mkv':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-purple-500">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" stroke="currentColor" strokeWidth="2" fill="none"/>
            <polygon points="10,8 16,12 10,16" fill="currentColor"/>
          </svg>
        );
      case 'pdf':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-red-500">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" fill="none"/>
            <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" fill="none"/>
            <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2"/>
            <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="2"/>
            <polyline points="10,9 9,9 8,9" stroke="currentColor" strokeWidth="2"/>
          </svg>
        );
      default:
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-500">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" fill="none"/>
            <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" fill="none"/>
          </svg>
        );
    }
  };

  return getFileIcon();
};

const TreeNodeComponent = ({ node, level, onNodeSelect, onNodeToggle, selectedNodeId, expandedNodes }: TreeNodeProps) => {
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedNodeId === node.id;
  const isExpanded = expandedNodes?.has(node.id) || false;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      onNodeToggle?.(node);
    }
  };

  const handleSelect = () => {
    onNodeSelect?.(node);
  };

  return (
    <div>
      <motion.div
        className={cn(
          "flex items-center gap-2 py-1 px-2 rounded-md cursor-pointer hover:bg-black/20 transition-colors",
          isSelected && "bg-blue-900/30 text-blue-400",
          "group"
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleSelect}
        whileHover={{ x: 2 }}
        transition={{ duration: 0.2 }}
      >
        {hasChildren && (
          <button
            onClick={handleToggle}
            className="p-0.5 hover:bg-black/20 rounded transition-colors"
          >
            <motion.div
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-gray-500">
                <polyline points="9,18 15,12 9,6" stroke="currentColor" strokeWidth="2" fill="none"/>
              </svg>
            </motion.div>
          </button>
        )}
        
        {!hasChildren && <div className="w-4" />}
        
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {node.type === 'folder' ? (
            <FolderIcon isOpen={isExpanded} />
          ) : (
            <FileIcon type={node.name} />
          )}
          
          <span className="truncate text-sm text-neutral-300">
            {node.name}
          </span>
          
          {node.size && (
            <span className="text-xs text-neutral-500 ml-auto">
              {node.size}
            </span>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {hasChildren && isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {node.children?.map((child) => (
              <TreeNodeComponent
                key={child.id}
                node={child}
                level={level + 1}
                onNodeSelect={onNodeSelect}
                onNodeToggle={onNodeToggle}
                selectedNodeId={selectedNodeId}
                expandedNodes={expandedNodes}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export function TreeView({ data, onNodeSelect, onNodeToggle, selectedNodeId, expandedNodes, className }: TreeViewProps) {
  return (
    <div className={cn("w-full h-full overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-neutral-800", className)}>
      {data.map((node) => (
        <TreeNodeComponent
          key={node.id}
          node={node}
          level={0}
          onNodeSelect={onNodeSelect}
          onNodeToggle={onNodeToggle}
          selectedNodeId={selectedNodeId}
          expandedNodes={expandedNodes}
        />
      ))}
    </div>
  );
}
