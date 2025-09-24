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
import { IconHome, IconSettings, IconUser } from "@tabler/icons-react";
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
  const [lastFocusedFolder, setLastFocusedFolder] = useState<TreeNode | undefined>();
  const params = useParams();
  const navigate = useNavigate();
  
  // Breadcrumb navigation state
  const [currentView, setCurrentView] = useState<TreeNode[]>(mockFileSystem);
  const [breadcrumbPath, setBreadcrumbPath] = useState<string[]>([]);
  const [navigationStack, setNavigationStack] = useState<TreeNode[][]>([]);
  const [navigationDirection, setNavigationDirection] = useState<'forward' | 'backward'>('forward');
  // Helper: find the path from root to a node id
  const findPathToNode = (nodes: TreeNode[], targetId: string, path: TreeNode[] = []): TreeNode[] | null => {
    for (const node of nodes) {
      const nextPath = [...path, node];
      if (node.id === targetId) return nextPath;
      if (node.children) {
        const found = findPathToNode(node.children, targetId, nextPath);
        if (found) return found;
      }
    }
    return null;
  };

  const selectedNodePath = selectedNode?.id ? findPathToNode(fileSystem, selectedNode.id) : null;
  // Treat top-level folders as having a virtual root parent
  const selectedFolderHasParent = selectedNode?.type === 'folder' && (
    (selectedNodePath ? selectedNodePath.length >= 1 : false)
  );
  const canGoBack = (selectedNode?.type === 'file' && !!lastFocusedFolder) || selectedFolderHasParent || navigationStack.length > 0 || breadcrumbPath.length > 0;
  
  // Context menu state
  const { isOpen, position, openContextMenu, closeContextMenu } = useContextMenu();
  const [contextActions, setContextActions] = useState<ContextMenuAction[]>([]);

  const handleNodeSelect = (node: TreeNode) => {
    setSelectedNode(node);
  };

  const handleFileClick = (node: TreeNode) => {
    if (node.type === 'folder') {
      setNavigationDirection('forward');
      // If we're viewing a folder's contents in the right panel (selectedNode is a folder)
      // and we click one of its child folders, navigate relative to that folder,
      // not relative to the currentView (which might still be root).
      if (
        selectedNode?.type === 'folder' &&
        selectedNode.children &&
        selectedNode.children.some((c) => c.id === node.id)
      ) {
        // Push the parent folder's children as the previous view
        setNavigationStack((prev) => [...prev, selectedNode.children as TreeNode[]]);
        // Ensure breadcrumb reflects parent folder before adding child
        setBreadcrumbPath((prev) => {
          const next = [...prev];
          if (next[next.length - 1] !== selectedNode.name) {
            next.push(selectedNode.name);
          }
          next.push(node.name);
          return next;
        });
        // Move into the clicked child folder
        setCurrentView(node.children || []);
        setExpandedNodes(new Set());
        setSelectedNode(node);
        return;
      }

      // Fallback: navigate using the general handler (tree-like navigation)
      handleNavigateToFolder(node);
    } else {
      // Capture the parent folder context when previewing a file
      if (selectedNode?.type === 'folder') {
        setLastFocusedFolder(selectedNode);
      }
      setSelectedNode(node);
    }
  };

  const handleContextMenu = (node: TreeNode, actions: ContextMenuAction[], event: React.MouseEvent) => {
    setContextActions(actions);
    openContextMenu(event, actions);
  };

  const handleGoHome = () => {
    setNavigationDirection('backward');
    setCurrentView(fileSystem);
    setBreadcrumbPath([]);
    setNavigationStack([]);
    setExpandedNodes(new Set());
    setSelectedNode({ id: 'virtual-root', name: 'Root', type: 'folder', children: fileSystem });
  };

  const handleOpenSettings = () => {
    console.log("Open Drive Settings");
  };

  const handleOpenProfileSettings = () => {
    console.log("Open Profile Settings");
  };

  const handleNavigateToFolder = (node: TreeNode) => {
    if (node.children) {
      setNavigationDirection('forward');
      // Add current view to navigation stack
      setNavigationStack(prev => [...prev, currentView]);
      
      // Update breadcrumb path
      setBreadcrumbPath(prev => [...prev, node.name]);
      
      // Set new current view to the folder's children
      setCurrentView(node.children);
      
      // Clear expanded nodes for the new view
      setExpandedNodes(new Set());
      
      // Keep this folder selected so right panel shows its contents
      setSelectedNode(node);
    }
  };

  const handleNavigateUp = () => {
    if (navigationStack.length > 0) {
      setNavigationDirection('backward');
      // Determine previous view and pop stack
      const previousView = navigationStack[navigationStack.length - 1];
      setCurrentView(previousView);
      setNavigationStack(prev => prev.slice(0, -1));
      
      // Update breadcrumb path and set selected node to a virtual parent folder
      setBreadcrumbPath(prev => {
        const newPath = prev.slice(0, -1);
        const parentName = newPath.length > 0 ? newPath[newPath.length - 1] : 'Root';
        const virtualId = `virtual-${newPath.join('/') || 'root'}`;
        setSelectedNode({ id: virtualId, name: parentName, type: 'folder', children: previousView });
        return newPath;
      });
      
      // Clear expanded nodes
      setExpandedNodes(new Set());
    } else if (breadcrumbPath.length > 0) {
      // Fallback: if stack is empty but breadcrumb says we're not at root,
      // go to root view to keep UX consistent
      setNavigationDirection('backward');
      setCurrentView(fileSystem);
      setBreadcrumbPath([]);
      setExpandedNodes(new Set());
      // At root: show root contents
      setSelectedNode({ id: 'virtual-root', name: 'Root', type: 'folder', children: fileSystem });
    }
  };

  const handleBack = () => {
    // If currently previewing a file, go back to its parent folder view
    if (selectedNode?.type === 'file' && lastFocusedFolder) {
      setNavigationDirection('backward');
      setSelectedNode(lastFocusedFolder);
      if (lastFocusedFolder.children) {
        setCurrentView(lastFocusedFolder.children);
      }
      // Ensure breadcrumb reflects the parent folder at the end
      setBreadcrumbPath(prev => {
        const next = [...prev];
        if (next[next.length - 1] !== lastFocusedFolder.name) {
          next.push(lastFocusedFolder.name);
        }
        return next;
      });
      // Reset expansion for consistency in the tree view
      setExpandedNodes(new Set());
      // Clear the last focused folder to avoid repeated overrides
      setLastFocusedFolder(undefined);
      // Do not mutate breadcrumb or navigationStack in this case
      return;
    }
    // If previewing a folder that has a parent but stack/breadcrumb are empty (e.g., selected via tree)
    if (selectedNode?.type === 'folder' && selectedNodePath) {
      // If deeper than top-level, go to actual parent in the path
      if (selectedNodePath.length > 1) {
        const parent = selectedNodePath[selectedNodePath.length - 2];
        setNavigationDirection('backward');
        setSelectedNode(parent);
        if (parent.children) {
          setCurrentView(parent.children);
        }
        const names = selectedNodePath.slice(0, -1).map(n => n.name);
        setBreadcrumbPath(names);
        setExpandedNodes(new Set());
        return;
      }
      // If top-level, go to virtual root
      setNavigationDirection('backward');
      setCurrentView(fileSystem);
      setBreadcrumbPath([]);
      setExpandedNodes(new Set());
      setSelectedNode({ id: 'virtual-root', name: 'Root', type: 'folder', children: fileSystem });
      return;
    }
    // Fallback to normal navigate up behavior
    handleNavigateUp();
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
          <SidebarBody className="justify-between gap-4 h-full relative">
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
                  <div className="mb-2 flex-shrink-0 flex items-center justify-center gap-2">
                    <button
                      onClick={handleGoHome}
                      className="p-2 rounded-full bg-black/40 border border-white/15 hover:bg-black/60 text-white transition-colors shadow-lg"
                      title="Home"
                    >
                      <IconHome size={18} />
                    </button>
                    <button
                      onClick={handleOpenSettings}
                      className="p-2 rounded-full bg-black/40 border border-white/15 hover:bg-black/60 text-white transition-colors shadow-lg"
                      title="Drive Settings"
                    >
                      <IconSettings size={18} />
                    </button>
                    <button
                      onClick={handleOpenProfileSettings}
                      className="p-2 rounded-full bg-black/40 border border-white/15 hover:bg-black/60 text-white transition-colors shadow-lg"
                      title="Profile Settings"
                    >
                      <IconUser size={18} />
                    </button>
                  </div>
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
                      navigationDirection={navigationDirection}
                    />
                  </div>
                </div>
              </div>
            </div>
          </SidebarBody>
        </Sidebar>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="border-b border-neutral-700 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBack}
                  disabled={!canGoBack}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
                    canGoBack
                      ? "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                      : "bg-neutral-900 text-neutral-600 cursor-not-allowed"
                  )}
                  title={canGoBack ? "Go back" : "No previous folder"}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m15 18-6-6 6-6"/>
                  </svg>
                  Back
                </button>

                <button
                  onClick={() => navigate("/")}
                  className="flex items-center gap-2 px-4 py-2 bg-neutral-800 text-neutral-300 rounded-lg hover:bg-neutral-700 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12h18"/>
                  </svg>
                  Drives
                </button>
              </div>
              
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
          <ContentPanel 
            selectedNode={selectedNode} 
            onFileClick={handleFileClick}
            onNavigateUp={handleBack}
            canNavigateUp={canGoBack}
          />
          
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
