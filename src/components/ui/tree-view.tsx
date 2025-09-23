"use client";
import { cn } from "../../renderer/lib/utils";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  IconFolder, 
  IconFolderOpen, 
  IconChevronRight, 
  IconFileText, 
  IconFile, 
  IconPhoto, 
  IconVideo, 
  IconFileTypePdf,
  IconFileCode,
  IconFileMusic,
  IconFileZip
} from "@tabler/icons-react";

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
  isOpen ? (
    <IconFolderOpen size={16} className="text-blue-500" />
  ) : (
    <IconFolder size={16} className="text-blue-500" />
  )
);

const FileIcon = ({ type }: { type: string }) => {
  const getFileIcon = () => {
    const extension = type.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'txt':
      case 'md':
        return <IconFileText size={16} className="text-gray-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return <IconPhoto size={16} className="text-green-500" />;
      case 'mp4':
      case 'avi':
      case 'mov':
      case 'mkv':
        return <IconVideo size={16} className="text-purple-500" />;
      case 'pdf':
        return <IconFileTypePdf size={16} className="text-red-500" />;
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
      case 'html':
      case 'css':
        return <IconFileCode size={16} className="text-blue-500" />;
      case 'mp3':
      case 'wav':
      case 'flac':
        return <IconFileMusic size={16} className="text-yellow-500" />;
      case 'zip':
      case 'rar':
      case '7z':
        return <IconFileZip size={16} className="text-orange-500" />;
      default:
        return <IconFile size={16} className="text-gray-500" />;
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
    // Also toggle folder expansion when clicking on folders
    if (hasChildren) {
      onNodeToggle?.(node);
    }
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
              <IconChevronRight size={12} className="text-gray-500" />
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
