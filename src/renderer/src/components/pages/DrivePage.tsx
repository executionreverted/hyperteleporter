"use client";
import React, { useState } from "react";
import { cn } from "../../../lib/utils";
import { Sidebar, SidebarBody, SidebarLink } from "../../../../components/ui/sidebar";
import { TreeView, TreeNode } from "../../../../components/ui/tree-view";
import { ContentPanel } from "../../../../components/ui/content-panel";
import { Dropzone } from "../../../../components/ui/dropzone";
import { Meteors } from "../../../../components/ui/meteors";
import { useParams, useNavigate } from "react-router-dom";

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
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-blue-500">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" fill="currentColor"/>
        <line x1="12" y1="8" x2="12" y2="16" stroke="currentColor" strokeWidth="2"/>
        <line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
  },
  {
    label: "Share",
    href: "#",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-purple-500">
        <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="2" fill="none"/>
        <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="2" fill="none"/>
        <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="2" fill="none"/>
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" stroke="currentColor" strokeWidth="2"/>
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
  },
];

export function DrivePage() {
  const [selectedNode, setSelectedNode] = useState<TreeNode | undefined>();
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
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
    // TODO: Add files to the selected/focused folder
    // For now, just log the files and show a mock message
    alert(`Uploaded ${files.length} file(s) to ${selectedNode?.name || 'root folder'}`);
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
                      data={mockFileSystem}
                      onNodeSelect={handleNodeSelect}
                      onNodeToggle={handleNodeToggle}
                      selectedNodeId={selectedNode?.id}
                      expandedNodes={expandedNodes}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="border-t border-neutral-700 pt-4 flex-shrink-0">
              <div className="flex flex-col gap-2">
                {quickActions.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickAction(action)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-neutral-400 hover:bg-black/20 hover:text-white transition-colors"
                    title={action.label}
                  >
                    {action.icon}
                    <span>{action.label}</span>
                  </button>
                ))}
              </div>
            </div>

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
              <button
                onClick={() => navigate("/")}
                className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-lg hover:bg-neutral-700 transition-colors"
              >
                Back to Drives
              </button>
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
