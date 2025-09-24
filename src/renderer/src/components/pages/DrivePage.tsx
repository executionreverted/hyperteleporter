"use client";
import { useState } from "react";
import { cn } from "../../../lib/utils";
import { Sidebar, SidebarBody, SidebarLink } from "../../../../components/ui/sidebar";
import { TreeView, TreeNode } from "../../../../components/ui/tree-view";
import { ContentPanel } from "../../../../components/ui/content-panel";
import { Dropzone } from "../../../../components/ui/dropzone";
import { Meteors } from "../../../../components/ui/meteors";
import Prism from "../../../../components/ui/prism";
import { ContextMenu, useContextMenu, ContextMenuAction } from "../../../../components/ui/context-menu";
import { useParams, useNavigate } from "react-router-dom";
import { IconFolderPlus, IconShare, IconUpload } from "@tabler/icons-react";
import { dummyData } from "../../data/dummy";

// Mock data for the file system - Complex nested structure
const mockFileSystem: TreeNode[] = dummyData as TreeNode[];

// Removed sidebar navigation links as requested

const quickActions = [
  {
    label: "New Folder",
    href: "#",
    icon: <IconFolderPlus size={16} className="text-blue-500" />,
  },
  {
    label: "Share",
    href: "#",
    icon: <IconShare size={16} className="text-purple-500" />,
  },
];

export function DrivePage() {
  const [selectedNode, setSelectedNode] = useState<TreeNode | undefined>();
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [fileSystem, setFileSystem] = useState<TreeNode[]>(mockFileSystem);
  const params = useParams();
  const navigate = useNavigate();
  
  // Breadcrumb navigation state
  const [currentView, setCurrentView] = useState<TreeNode[]>(mockFileSystem);
  const [breadcrumbPath, setBreadcrumbPath] = useState<string[]>([]);
  const [navigationStack, setNavigationStack] = useState<TreeNode[][]>([mockFileSystem]);
  
  // Context menu state
  const { isOpen, position, openContextMenu, closeContextMenu } = useContextMenu();
  const [contextActions, setContextActions] = useState<ContextMenuAction[]>([]);

  const handleNodeSelect = (node: TreeNode) => {
    setSelectedNode(node);
  };

  const handleFileClick = (node: TreeNode) => {
    setSelectedNode(node);
  };

  const handleContextMenu = (node: TreeNode, actions: ContextMenuAction[], event: React.MouseEvent) => {
    setContextActions(actions);
    openContextMenu(event, actions);
  };

  const handleNavigateToFolder = (node: TreeNode) => {
    if (node.children) {
      // Add current view to navigation stack
      setNavigationStack(prev => [...prev, currentView]);
      
      // Update breadcrumb path
      setBreadcrumbPath(prev => [...prev, node.name]);
      
      // Set new current view to the folder's children
      setCurrentView(node.children);
      
      // Clear expanded nodes for the new view
      setExpandedNodes(new Set());
      
      // Clear selected node
      setSelectedNode(undefined);
    }
  };

  const handleNavigateUp = () => {
    if (navigationStack.length > 1) {
      // Remove the last item from navigation stack
      const newStack = navigationStack.slice(0, -1);
      setNavigationStack(newStack);
      
      // Update breadcrumb path
      setBreadcrumbPath(prev => prev.slice(0, -1));
      
      // Set current view to the previous level
      setCurrentView(newStack[newStack.length - 1]);
      
      // Clear expanded nodes
      setExpandedNodes(new Set());
      
      // Clear selected node
      setSelectedNode(undefined);
    }
  };

  const handleFileUpload = (files: File[]) => {
    console.log("Files uploaded:", files);
    
    // Create new file nodes from uploaded files
    const newFiles: TreeNode[] = files.map((file, index) => ({
      id: `uploaded-${Date.now()}-${index}`,
      name: file.name,
      type: 'file' as const,
      size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      modified: new Date().toLocaleDateString(),
    }));

    // Add files to the selected folder or root
    setFileSystem(prevSystem => {
      if (selectedNode && selectedNode.type === 'folder') {
        // Add to selected folder
        return addFilesToFolder(prevSystem, selectedNode.id, newFiles);
      } else {
        // Add to root
        return [...prevSystem, ...newFiles];
      }
    });

    // Show success message
    const targetFolder = selectedNode?.type === 'folder' ? selectedNode.name : 'root folder';
    alert(`Successfully uploaded ${files.length} file(s) to ${targetFolder}`);
  };

  // Helper function to add files to a specific folder
  const addFilesToFolder = (nodes: TreeNode[], folderId: string, newFiles: TreeNode[]): TreeNode[] => {
    return nodes.map(node => {
      if (node.id === folderId && node.type === 'folder') {
        return {
          ...node,
          children: [...(node.children || []), ...newFiles]
        };
      } else if (node.children) {
        return {
          ...node,
          children: addFilesToFolder(node.children, folderId, newFiles)
        };
      }
      return node;
    });
  };

  const handleNodeToggle = (node: TreeNode) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(node.id)) {
        newSet.delete(node.id);
      } else {
        newSet.add(node.id);
      }
      return newSet;
    });
  };

  const handleQuickAction = (action: typeof quickActions[0]) => {
    console.log("Quick action:", action.label);
    // Handle quick actions
  };

  return (
    <div className="min-h-screen bg-black relative">
      <div
        className={cn(
          "flex w-full flex-1 flex-col overflow-hidden md:flex-row",
          "h-screen relative z-20"
        )}
      >
        <Sidebar open={true} setOpen={() => {}}>
          <SidebarBody className="justify-between gap-4 h-full">
            <div className="flex flex-1 flex-col overflow-x-hidden">
              {/* Logo */}
              <div className="flex items-center gap-2 mb-4 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">H</span>
                  </div>
                  <span className="font-bold text-lg text-white">
                    Hyperdrive
                  </span>
                </div>
              </div>

              {/* Navigation Links removed as requested */}

              {/* File Tree - Scrollable */}
              <div className="flex-1 min-h-0">
                <div className="h-full flex flex-col">
                  <h3 className="text-sm font-medium text-neutral-300 mb-2 flex-shrink-0">
                    File System
                  </h3>
                  <div className="flex-1 min-h-0">
                    <TreeView
                      data={currentView}
                      onNodeSelect={handleNodeSelect}
                      onNodeToggle={handleNodeToggle}
                      selectedNodeId={selectedNode?.id}
                      expandedNodes={expandedNodes}
                      onContextMenu={handleContextMenu}
                      onNavigateUp={handleNavigateUp}
                      onNavigateToFolder={handleNavigateToFolder}
                      showBreadcrumb={true}
                      breadcrumbPath={breadcrumbPath}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions removed - now in header */}

            {/* User Profile */}
            <div className="border-t border-neutral-700 pt-4 flex-shrink-0">
              <SidebarLink
                link={{
                  label: "Drive Settings",
                  href: "#",
                  icon: (
                    <div className="h-7 w-7 shrink-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                      <span className="text-white font-bold text-xs">U</span>
                    </div>
                  ),
                }}
              />
            </div>
          </SidebarBody>
        </Sidebar>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="border-b border-neutral-700 p-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate("/")}
                className="flex items-center gap-2 px-4 py-2 bg-neutral-800 text-neutral-300 rounded-lg hover:bg-neutral-700 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15 18-6-6 6-6"/>
                </svg>
                Back to Drives
              </button>
              
              <div className="flex items-center gap-4">
                {/* Quick Actions */}
                <div className="flex gap-2">
                  {quickActions.map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleQuickAction(action)}
                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-400 hover:bg-black/20 hover:text-white transition-colors rounded-lg"
                      title={action.label}
                    >
                      {action.icon}
                      <span>{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Content Panel */}
          <ContentPanel selectedNode={selectedNode} onFileClick={handleFileClick} />
          
          {/* Dropzone */}
          <Dropzone onFileUpload={handleFileUpload} />
        </div>
      </div>
      
      {/* Prism Background */}
      <div className="absolute inset-0 z-0">
        <Prism 
          height={2}
          baseWidth={5}
          animationType="3drotate"
          glow={0.3}
          noise={0.3}
          scale={4.2}
          hueShift={0.5}
          colorFrequency={2.7}
          timeScale={0.12}
          bloom={1.2}
        />
      </div>
      
      {/* Meteors Background */}
      <Meteors number={20} />
      
      {/* Context Menu - rendered outside all containers */}
      <ContextMenu
        isOpen={isOpen}
        position={position}
        actions={contextActions}
        onClose={closeContextMenu}
      />
    </div>
  );
}
