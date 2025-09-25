"use client";
import { cn } from "../../renderer/lib/utils";
import { useState, useRef } from "react";
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
import { ContextMenuAction, useContextMenu, ContextMenu } from "./context-menu";

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
  navigationDirection?: 'forward' | 'backward';
  className?: string;
  onCreateFolder?: (parentPath: string) => void;
  onRefresh?: () => void;
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
  onCreateFolder?: (parentPath: string) => void;
  onRefresh?: () => void;
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

const TreeNodeComponent = ({ node, level, onNodeSelect, onNodeToggle, selectedNodeId, expandedNodes, onContextMenu, onNavigateToFolder, onCreateFolder, onRefresh }: TreeNodeProps) => {
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedNodeId === node.id;
  const isExpanded = expandedNodes?.has(node.id) || false;
  const clickTimeoutRef = useRef<number | null>(null);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Simple: if it has children, allow expansion
    if (hasChildren) {
      onNodeToggle?.(node);
    }
  };

  const handleClick = () => {
    // Use a small delay to differentiate single vs double click
    if (clickTimeoutRef.current) {
      window.clearTimeout(clickTimeoutRef.current);
    }
    // @ts-ignore - window.setTimeout returns a number in browsers
    clickTimeoutRef.current = window.setTimeout(() => {
      onNodeSelect?.(node);
      // No auto-expansion - user controls everything
      clickTimeoutRef.current = null;
    }, 200);
  };

  const handleDoubleClick = () => {
    // Cancel pending single-click action
    if (clickTimeoutRef.current) {
      window.clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    if (node.type === 'folder') {
      onNavigateToFolder?.(node);
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
        onClick: () => onCreateFolder?.(node.id),
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
        data-tree-item
        className={cn(
          "flex items-center gap-2 py-1 px-2 rounded-md cursor-pointer hover:bg-black/20 transition-colors select-none",
          isSelected && "bg-blue-900/30 text-blue-400",
          "group"
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
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
          {node.name === '...' && node.id.includes('__more__') ? (
            <IconChevronRight size={16} className="text-blue-400" />
          ) : node.type === 'folder' ? (
            <FolderIcon isOpen={isExpanded} />
          ) : (
            <FileIcon type={node.name} />
          )}
          
          <span className={`truncate text-sm ${
            node.name === '...' && node.id.includes('__more__') 
              ? 'text-blue-400 italic font-medium' 
              : 'text-neutral-300'
          }`}>
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
                onCreateFolder={onCreateFolder}
                onRefresh={onRefresh}
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
  navigationDirection = 'forward',
  className,
  onCreateFolder,
  onRefresh
}: TreeViewProps) {
  const { isOpen, position, actions, openContextMenu, closeContextMenu } = useContextMenu()

  const onContainerRightClick = (e: React.MouseEvent) => {
    // Only show container menu if clicking on empty space, not on tree items
    if ((e.target as HTMLElement).closest('[data-tree-item]')) {
      return // Let the tree item handle its own context menu
    }
    
    e.preventDefault()
    e.stopPropagation()
    
    const containerActions: ContextMenuAction[] = [
      { id: 'create-folder', label: 'Create Folder', icon: <IconFolderPlus size={16} />, onClick: () => onCreateFolder?.('/') },
      { id: 'refresh', label: 'Refresh', icon: <IconArrowUp size={16} />, onClick: () => onRefresh?.() },
    ]
    
    openContextMenu(e, containerActions)
  }
  const handleNavigateTo = (index: number) => {
    // This will be handled by the parent component
    // For now, we'll just navigate up to the root
    onNavigateUp?.();
  };

  return (
    <div className={cn("w-full h-full overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-neutral-800", className)} onContextMenu={onContainerRightClick}>
      {showBreadcrumb && (
        <BreadcrumbNavigation
          path={breadcrumbPath}
          onNavigateTo={handleNavigateTo}
        />
      )}

      {/* Context header showing parent and current for better orientation */}
      {showBreadcrumb && (
        (() => {
          const currentName = breadcrumbPath[breadcrumbPath.length - 1];
          const parentName = breadcrumbPath.length > 1 ? breadcrumbPath[breadcrumbPath.length - 2] : undefined;
          return (
            <div className="flex items-center gap-2 px-2 py-1 mb-1 text-xs text-neutral-500">
              {parentName && (
                <>
                  <span className="text-neutral-400">Parent:</span>
                  <span className="text-neutral-300 truncate max-w-[140px]" title={parentName}>{parentName}</span>
                  <span className="text-neutral-600">/</span>
                </>
              )}
              {currentName && (
                <>
                  <span className="text-neutral-400">Current:</span>
                  <span className="text-neutral-200 truncate max-w-[160px]" title={currentName}>{currentName}</span>
                </>
              )}
            </div>
          );
        })()
      )}
      
      <AnimatePresence mode="wait">
        <motion.div
          key={(breadcrumbPath && breadcrumbPath.length > 0) ? breadcrumbPath.join('/') : 'root'}
          initial={{ opacity: 0, x: navigationDirection === 'forward' ? 8 : -8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: navigationDirection === 'forward' ? -8 : 8 }}
          transition={{ duration: 0.12, ease: "easeOut" }}
          className="space-y-1 p-2"
        >
          {/* Parent navigation removed - handled in tree data */}
          
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
              onCreateFolder={onCreateFolder}
              onRefresh={onRefresh}
            />
          ))}
        </motion.div>
      </AnimatePresence>
      <ContextMenu isOpen={isOpen} position={position} actions={actions} onClose={closeContextMenu} />
    </div>
  );
}
