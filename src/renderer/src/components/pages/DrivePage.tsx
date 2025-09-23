"use client";
import React, { useState } from "react";
import { cn } from "../../../lib/utils";
import { Sidebar, SidebarBody, SidebarLink } from "../../../../components/ui/sidebar";
import { TreeView, TreeNode } from "../../../../components/ui/tree-view";
import { ContentPanel } from "../../../../components/ui/content-panel";
import { Dropzone } from "../../../../components/ui/dropzone";
import { Meteors } from "../../../../components/ui/meteors";
import { useParams, useNavigate } from "react-router-dom";
import { IconFolderPlus, IconShare, IconUpload } from "@tabler/icons-react";

// Mock data for the file system
const mockFileSystem: TreeNode[] = [
  {
    id: "1",
    name: "Documents",
    type: "folder",
    size: "2.3 MB",
    modified: "2 days ago",
    children: [
      {
        id: "1-1",
        name: "Project Alpha",
        type: "folder",
        size: "1.2 MB",
        modified: "1 day ago",
        children: [
          {
            id: "1-1-1",
            name: "README.md",
            type: "file",
            size: "2.1 KB",
            modified: "3 hours ago",
          },
          {
            id: "1-1-2",
            name: "design.pdf",
            type: "file",
            size: "1.1 MB",
            modified: "1 day ago",
          },
        ],
      },
      {
        id: "1-2",
        name: "notes.txt",
        type: "file",
        size: "1.1 KB",
        modified: "2 days ago",
      },
    ],
  },
  {
    id: "2",
    name: "Images",
    type: "folder",
    size: "15.7 MB",
    modified: "1 week ago",
    children: [
      {
        id: "2-1",
        name: "vacation.jpg",
        type: "file",
        size: "3.2 MB",
        modified: "1 week ago",
      },
      {
        id: "2-2",
        name: "screenshot.png",
        type: "file",
        size: "2.1 MB",
        modified: "3 days ago",
      },
    ],
  },
  {
    id: "3",
    name: "Videos",
    type: "folder",
    size: "245.8 MB",
    modified: "2 weeks ago",
    children: [
      {
        id: "3-1",
        name: "presentation.mp4",
        type: "file",
        size: "245.8 MB",
        modified: "2 weeks ago",
      },
    ],
  },
  {
    id: "4",
    name: "config.json",
    type: "file",
    size: "0.8 KB",
    modified: "1 month ago",
  },
];

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

  const handleNodeSelect = (node: TreeNode) => {
    setSelectedNode(node);
  };

  const handleFileClick = (node: TreeNode) => {
    setSelectedNode(node);
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
              <div className="flex items-center gap-2 mb-8 flex-shrink-0">
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
              <div className="flex-1 min-h-0 mt-8">
                <div className="h-full flex flex-col">
                  <h3 className="text-sm font-medium text-neutral-300 mb-2 flex-shrink-0">
                    File System
                  </h3>
                  <div className="flex-1 min-h-0">
                    <TreeView
                      data={fileSystem}
                      onNodeSelect={handleNodeSelect}
                      onNodeToggle={handleNodeToggle}
                      selectedNodeId={selectedNode?.id}
                      expandedNodes={expandedNodes}
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
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Drive: {params.driveId || "My Drive"}
                </h1>
                <p className="text-sm text-neutral-400">
                  {selectedNode ? `Selected: ${selectedNode.name}` : "Select a file or folder to view details"}
                </p>
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
                <button
                  onClick={() => navigate("/")}
                  className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-lg hover:bg-neutral-700 transition-colors"
                >
                  Back to Drives
                </button>
              </div>
            </div>
          </div>

          {/* Content Panel */}
          <ContentPanel selectedNode={selectedNode} onFileClick={handleFileClick} />
          
          {/* Dropzone */}
          <Dropzone onFileUpload={handleFileUpload} />
        </div>
      </div>
      
      {/* Meteors Background */}
      <Meteors number={20} />
    </div>
  );
}
