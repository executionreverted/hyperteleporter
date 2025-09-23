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
  IconFileZip,
  IconEdit, 
  IconTrash, 
  IconCopy, 
  IconCut, 
  IconDownload, 
  IconShare, 
  IconFolderPlus,
  IconFilePlus,
  IconEye,
  IconArrowUp
} from "@tabler/icons-react";
import { ContextMenuAction } from "./context-menu";

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
  onContextMenu?: (node: TreeNode, actions: ContextMenuAction[], event: React.MouseEvent) => void;
  onNavigateUp?: () => void;
  onNavigateToFolder?: (node: TreeNode) => void;
  showBreadcrumb?: boolean;
  breadcrumbPath?: string[];
  className?: string;
}

interface TreeNodeProps {
  node: TreeNode;
  level: number;
  onNodeSelect?: (node: TreeNode) => void;
  onNodeToggle?: (node: TreeNode) => void;
  selectedNodeId?: string;
  expandedNodes?: Set<string>;
  onContextMenu?: (node: TreeNode, actions: ContextMenuAction[], event: React.MouseEvent) => void;
  onNavigateToFolder?: (node: TreeNode) => void;
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

const TreeNodeComponent = ({ node, level, onNodeSelect, onNodeToggle, selectedNodeId, expandedNodes, onContextMenu, onNavigateToFolder }: TreeNodeProps) => {
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
    
    // Check if this is a folder with nested folders (2+ levels deep)
    if (hasChildren && node.children) {
      const hasNestedFolders = node.children.some(child => 
        child.type === 'folder' && child.children && child.children.length > 0
      );
      
      if (hasNestedFolders) {
        // Navigate to this folder as a pseudo-root
        onNavigateToFolder?.(node);
      } else {
        // Regular expansion for folders without nested folders
        onNodeToggle?.(node);
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const actions: ContextMenuAction[] = [
      {
        id: 'rename',
        label: 'Rename',
        icon: <IconEdit size={16} />,
        onClick: () => console.log('Rename', node.name),
      },
      {
        id: 'copy',
        label: 'Copy',
        icon: <IconCopy size={16} />,
        onClick: () => console.log('Copy', node.name),
      },
      {
        id: 'cut',
        label: 'Cut',
        icon: <IconCut size={16} />,
        onClick: () => console.log('Cut', node.name),
      },
      {
        id: 'download',
        label: 'Download',
        icon: <IconDownload size={16} />,
        onClick: () => console.log('Download', node.name),
        disabled: node.type === 'folder',
      },
      {
        id: 'share',
        label: 'Share',
        icon: <IconShare size={16} />,
        onClick: () => console.log('Share', node.name),
      },
      {
        id: 'separator1',
        label: '',
        icon: <div className="h-px bg-white/20" />,
        onClick: () => {},
        disabled: true,
      },
      {
        id: 'new-folder',
        label: 'New Folder',
        icon: <IconFolderPlus size={16} />,
        onClick: () => console.log('New Folder in', node.name),
        disabled: node.type === 'file',
      },
      {
        id: 'new-file',
        label: 'New File',
        icon: <IconFilePlus size={16} />,
        onClick: () => console.log('New File in', node.name),
        disabled: node.type === 'file',
      },
      {
        id: 'separator2',
        label: '',
        icon: <div className="h-px bg-white/20" />,
        onClick: () => {},
        disabled: true,
      },
      {
        id: 'delete',
        label: 'Delete',
        icon: <IconTrash size={16} />,
        onClick: () => console.log('Delete', node.name),
        destructive: true,
      },
    ];

    onContextMenu?.(node, actions, e);
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
        onContextMenu={handleContextMenu}
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
                onContextMenu={onContextMenu}
                onNavigateToFolder={onNavigateToFolder}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Breadcrumb component for navigation
function BreadcrumbNavigation({ 
  path, 
  onNavigateTo 
}: { 
  path: string[]; 
  onNavigateTo: (index: number) => void;
}) {
  // Show only the last 3 segments to prevent overflow
  const displayPath = path.length > 3 ? path.slice(-3) : path;
  const hasHiddenSegments = path.length > 3;

  return (
    <div className="flex items-center gap-1 px-2 py-1 mb-2 text-xs text-neutral-400 border-b border-neutral-700/30 overflow-hidden">
      {path.length === 0 ? (
        <span className="px-2 py-1 text-neutral-400">Root</span>
      ) : (
        <>
          {hasHiddenSegments && (
            <>
              <span className="text-neutral-500 flex-shrink-0">...</span>
              <IconChevronRight size={12} className="text-neutral-600 flex-shrink-0" />
            </>
          )}
          
          {displayPath.map((segment, index) => {
            const actualIndex = hasHiddenSegments ? path.length - 3 + index : index;
            return (
              <div key={actualIndex} className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => onNavigateTo(actualIndex)}
                  className="px-2 py-1 rounded hover:bg-black/20 transition-colors hover:text-white truncate max-w-[120px]"
                  title={segment}
                >
                  {segment}
                </button>
                {index < displayPath.length - 1 && (
                  <IconChevronRight size={12} className="text-neutral-600 flex-shrink-0" />
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

export function TreeView({ 
  data, 
  onNodeSelect, 
  onNodeToggle, 
  selectedNodeId, 
  expandedNodes, 
  onContextMenu, 
  onNavigateUp,
  onNavigateToFolder,
  showBreadcrumb = false,
  breadcrumbPath = [],
  className 
}: TreeViewProps) {
  const handleNavigateTo = (index: number) => {
    // This will be handled by the parent component
    // For now, we'll just navigate up to the root
    onNavigateUp?.();
  };

  return (
    <div className={cn("w-full h-full overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-neutral-800", className)}>
      {showBreadcrumb && (
        <BreadcrumbNavigation
          path={breadcrumbPath}
          onNavigateTo={handleNavigateTo}
        />
      )}
      
      <div className="space-y-1 p-2">
        {/* Parent navigation item - always reserve space, show content only when navigable */}
        {showBreadcrumb && (
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              breadcrumbPath.length > 0 && onNavigateUp
                ? 'hover:bg-black/20 cursor-pointer text-neutral-400 hover:text-white'
                : 'text-transparent cursor-default'
            }`}
            onClick={breadcrumbPath.length > 0 && onNavigateUp ? onNavigateUp : undefined}
            title={breadcrumbPath.length > 0 ? "Go to parent folder" : undefined}
          >
            <IconArrowUp size={16} />
            <span className="text-sm font-medium">..</span>
          </div>
        )}
        
        {data.map((node) => (
          <TreeNodeComponent
            key={node.id}
            node={node}
            level={0}
            onNodeSelect={onNodeSelect}
            onNodeToggle={onNodeToggle}
            selectedNodeId={selectedNodeId}
            expandedNodes={expandedNodes}
            onContextMenu={onContextMenu}
            onNavigateToFolder={onNavigateToFolder}
          />
        ))}
      </div>
    </div>
  );
}
