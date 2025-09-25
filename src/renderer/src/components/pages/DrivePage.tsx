"use client";
import { useEffect, useMemo, useState, startTransition, useRef } from "react";
import { cn } from "../../../lib/utils";
import { Sidebar, SidebarBody, SidebarLink } from "../../../../components/ui/sidebar";
import { TreeView, TreeNode } from "../../../../components/ui/tree-view";
import { ContentPanel } from "../../../../components/ui/content-panel";
import { Dropzone } from "../../../../components/ui/dropzone";
import { Meteors } from "../../../../components/ui/meteors";
import Prism from "../../../../components/ui/prism";
import { ContextMenu, useContextMenu, ContextMenuAction } from "../../../../components/ui/context-menu";
import FileSearchModal from "../common/FileSearchModal";
import { useParams, useNavigate } from "react-router-dom";
import { IconFolderPlus, IconShare, IconUpload } from "@tabler/icons-react";
import { IconHome, IconSettings, IconUser } from "@tabler/icons-react";
import ExpandAllIcon from "../../assets/expand-all.svg";
import CollapseAllIcon from "../../assets/collapse-all.svg";
import FolderIcon from "../../assets/folder.svg";
import FolderOpenIcon from "../../assets/folder-open.svg";
// Removed dummy data usage
import Shuffle from "../../../../components/ui/Shuffle";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalTrigger, useModal } from "../../../../components/ui/animated-modal";
import { MagicButton } from "../common/MagicButton";
import MagicButtonWide from "../../../../components/ui/magic-button-wide";
import { DelayedTooltip } from "../../../../components/ui/delayed-tooltip";
import { HardDriveIcon } from "../../../../components/ui/hard-drive-icon";
import { ShareModal } from "../common/ShareModal";

// Start empty; will load from Hyperdrive via IPC
const mockFileSystem: TreeNode[] = [];

// Removed sidebar navigation links as requested

const quickActions = [
  {
    label: "New Folder",
    href: "#",
    icon: <img src={FolderIcon} alt="New Folder" className="w-4 h-4" />,
  },
  {
    label: "Share",
    href: "#",
    icon: <IconShare size={16} className="text-purple-500" />,
  },
];

export function DrivePage() {
  const [selectedNode, setSelectedNode] = useState<TreeNode | undefined>();
  const [fileSystem, setFileSystem] = useState<TreeNode[]>(mockFileSystem);
  const [completeFileSystem, setCompleteFileSystem] = useState<TreeNode[]>(mockFileSystem);
  const [lastFocusedFolder, setLastFocusedFolder] = useState<TreeNode | undefined>();
  
  // Tree system state
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [treeRoot, setTreeRoot] = useState<string>('/'); // Current root path for tree
  const [hoveredEllipsis, setHoveredEllipsis] = useState<boolean>(false);
  const [hideTimeout, setHideTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [targetFolderForNewFolder, setTargetFolderForNewFolder] = useState<string>('/');
  
  // Drive information state
  const [currentDrive, setCurrentDrive] = useState<{ id: string; name: string; driveKey: string } | null>(null);
  
  const params = useParams();
  const navigate = useNavigate();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const api = useMemo(() => (window as any)?.api ?? null, []);
  // Fallback invokers in case preload did not expose new methods yet
  async function invokeListFolder(driveId: string, folder: string, recursive = false) {
    if (api?.drives?.listFolder) return api.drives.listFolder(driveId, folder, recursive)
    // @ts-ignore
    const electron = (window as any)?.electron
    if (electron?.ipcRenderer?.invoke) return electron.ipcRenderer.invoke('drives:listFolder', { driveId, folder, recursive })
    console.warn('[DrivePage] listFolder not available (no preload + no ipc)')
    return []
  }

  async function invokeCreateFolder(driveId: string, folderPath: string) {
    if (api?.drives?.createFolder) return api.drives.createFolder(driveId, folderPath)
    // @ts-ignore
    const electron = (window as any)?.electron
    if (electron?.ipcRenderer?.invoke) return electron.ipcRenderer.invoke('drives:createFolder', { driveId, folderPath })
    console.warn('[DrivePage] createFolder not available (no preload + no ipc)')
    return false
  }

  async function invokeUploadFiles(driveId: string, folderPath: string, files: Array<{ name: string; data: ArrayBuffer }>) {
    if (api?.drives?.uploadFiles) return api.drives.uploadFiles(driveId, folderPath, files)
    // @ts-ignore
    const electron = (window as any)?.electron
    if (electron?.ipcRenderer?.invoke) {
      // Pass ArrayBuffers; main will normalize to Buffers
      return electron.ipcRenderer.invoke('drives:uploadFiles', {
        driveId,
        folderPath,
        files: files.map(f => ({ name: f.name, data: f.data }))
      })
    }
    console.warn('[DrivePage] uploadFiles not available (no preload + no ipc)')
    return { uploaded: 0 }
  }

  async function invokeDeleteFile(driveId: string, path: string) {
    if (api?.drives?.deleteFile) return api.drives.deleteFile(driveId, path)
    // @ts-ignore
    const electron = (window as any)?.electron
    if (electron?.ipcRenderer?.invoke) return electron.ipcRenderer.invoke('drives:deleteFile', { driveId, path })
    console.warn('[DrivePage] deleteFile not available (no preload + no ipc)')
    return false
  }
  useEffect(() => {
    // Basic diagnostics
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w: any = window as any
    console.log('[DrivePage] diagnostics:', {
      hasApi: !!w?.api,
      drivesApi: w?.api?.drives ? Object.keys(w.api.drives) : null
    })
    if (!w?.api) {
      console.warn('[DrivePage] window.api is missing. Is preload loaded?')
    }
  }, [])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hideTimeout) {
        clearTimeout(hideTimeout);
      }
    };
  }, [hideTimeout]);

  // Load drive information
  useEffect(() => {
    let mounted = true;
    async function loadDriveInfo() {
      try {
        const driveId = params.driveId as string | undefined;
        if (!driveId || !api?.drives?.list) return;
        
        const drives = await api.drives.list();
        if (!mounted) return;
        
        const currentDriveInfo = drives.find((d: any) => d.id === driveId);
        if (currentDriveInfo) {
          setCurrentDrive({
            id: currentDriveInfo.id,
            name: currentDriveInfo.name,
            driveKey: currentDriveInfo.publicKeyHex
          });
        }
      } catch (error) {
        console.error('[DrivePage] Failed to load drive info:', error);
      }
    }
    loadDriveInfo();
    return () => { mounted = false };
  }, [api, params.driveId]);

  // Load folder listing for this drive
  useEffect(() => {
    let mounted = true;
    async function loadRoot() {
      try {
        const driveId = params.driveId as string | undefined;
        if (!driveId) return;
        
        // Load root folder contents for current view
        const entries: Array<{ key: string, value: any }> = await invokeListFolder(driveId, '/', false);
        console.log('[DrivePage] listFolder / entries=', entries)
        if (!mounted) return;
        const rootChildren = buildNodesForFolder('/', entries);
        console.log('[DrivePage] computed root children', rootChildren)
        setFileSystem(rootChildren);
        setCurrentView(rootChildren);
        setSelectedNode({ id: 'virtual-root', name: 'Root', type: 'folder', children: rootChildren });
        setNavigationDirection('forward');
        setNavigationStack([]);
        setBreadcrumbPath([]);
        setLastFocusedFolder(undefined);
        
        
        // Load complete file system for search
        const allEntries: Array<{ key: string, value: any }> = await invokeListFolder(driveId, '/', true);
        console.log('[DrivePage] complete file system entries=', allEntries.map(e => e.key))
        if (!mounted) return;
        const completeTree = buildCompleteFileSystemTree(allEntries);
        console.log('[DrivePage] computed complete file system tree', completeTree)
        console.log('[DrivePage] flattened files for search:', flattenFilesForDebug(completeTree))
        
        // Log the complete tree structure for debugging
        console.log('[DEBUG] Complete tree structure:');
        const logTree = (nodes: TreeNode[], depth = 0) => {
          const indent = '  '.repeat(depth);
          nodes.forEach(node => {
            console.log(`${indent}${node.name} (${node.id}) - children: ${node.children?.length || 0}`);
            if (node.children && node.children.length > 0) {
              logTree(node.children, depth + 1);
            }
          });
        };
        logTree(completeTree);
        
        setCompleteFileSystem(completeTree);
        
      } catch {}
    }
    loadRoot();
    return () => { mounted = false };
  }, [api, params.driveId]);

  // Auto-expand all folders when file system is loaded and has nodes
  useEffect(() => {
    if (completeFileSystem.length > 0) {
      const allExpanded = expandAllFolders(completeFileSystem);
      setExpandedNodes(allExpanded);
    }
  }, [completeFileSystem]);

  function buildNodesForFolder(currentFolderPath: string, entries: Array<{ key: string, value: any }>): TreeNode[] {
    const normalized = currentFolderPath.endsWith('/') ? currentFolderPath : currentFolderPath + '/'
    const folderNames = new Set<string>()
    const files: TreeNode[] = []
    for (const e of entries) {
      if (!e.key.startsWith(normalized)) continue
      const rel = e.key.slice(normalized.length)
      if (!rel) continue
      const segments = rel.split('/').filter(Boolean)
      if (segments.length === 0) continue
      if (segments.length > 1) {
        // child inside a subfolder ⇒ show top-level folder name only
        folderNames.add(segments[0])
      } else {
        // direct child
        const baseName = segments[0]
        if (baseName === '.keep') continue // hide marker
        const isFile = !!e.value?.blob || !!e.value?.linkname
        if (isFile) {
          files.push({ id: e.key, name: baseName, type: 'file' })
        } else {
          folderNames.add(baseName)
        }
      }
    }
    const folders: TreeNode[] = Array.from(folderNames).map((name) => ({ id: normalized + name, name, type: 'folder', children: [] }))
    return [...folders, ...files]
  }

  function buildCompleteFileSystemTree(entries: Array<{ key: string, value: any }>): TreeNode[] {
    const tree: { [key: string]: TreeNode } = {}
    
    // First pass: create all nodes (including intermediate folders)
    for (const entry of entries) {
      const key = entry.key
      if (key === '/') continue // skip root
      
      const segments = key.split('/').filter(Boolean)
      if (segments.length === 0) continue
      
      const isFile = !!entry.value?.blob || !!entry.value?.linkname
      
      // Skip .keep files but still create folder structure
      if (segments[segments.length - 1] === '.keep') {
        // Create intermediate folders for .keep files
        for (let i = 1; i < segments.length; i++) {
          const folderPath = '/' + segments.slice(0, i).join('/')
          if (!tree[folderPath]) {
            tree[folderPath] = {
              id: folderPath,
              name: segments[i - 1],
              type: 'folder',
              children: []
            }
          }
        }
        continue
      }
      
      const node: TreeNode = {
        id: key,
        name: segments[segments.length - 1],
        type: isFile ? 'file' : 'folder',
        children: isFile ? undefined : []
      }
      
      tree[key] = node
      
      // Create intermediate folders for nested items
      for (let i = 1; i < segments.length; i++) {
        const folderPath = '/' + segments.slice(0, i).join('/')
        if (!tree[folderPath]) {
          tree[folderPath] = {
            id: folderPath,
            name: segments[i - 1],
            type: 'folder',
            children: []
          }
        }
      }
    }
    
    // Second pass: build hierarchy
    const rootNodes: TreeNode[] = []
    for (const key in tree) {
      const node = tree[key]
      const segments = key.split('/').filter(Boolean)
      
      if (segments.length === 1) {
        // Root level item
        rootNodes.push(node)
      } else {
        // Nested item - find parent
        const parentPath = '/' + segments.slice(0, -1).join('/')
        const parent = tree[parentPath]
        if (parent && parent.type === 'folder' && parent.children) {
          parent.children.push(node)
        }
      }
    }
    
    return rootNodes
  }

  function flattenFilesForDebug(nodes: TreeNode[], parentPath: string[] = []): string[] {
    const results: string[] = []
    for (const node of nodes) {
      const currentPath = [...parentPath, node.name]
      if (node.type === "file") {
        results.push(currentPath.join(" / "))
      } else if (node.children && node.children.length > 0) {
        results.push(...flattenFilesForDebug(node.children, currentPath))
      }
    }
    return results
  }

  function getCurrentFolderPath(): string {
    // Use treeRoot which represents the current folder path in the new tree navigation system
    return treeRoot
  }

  async function reloadCurrentFolder() {
    const driveId = params.driveId as string | undefined;
    if (!driveId) return;
    const currentFolderPath = getCurrentFolderPath()
    const entries: Array<{ key: string, value: any }> = await invokeListFolder(driveId, currentFolderPath, false)
    console.log('[DrivePage] reload entries for', currentFolderPath, entries)
    
    // Reload complete file system for search
    try {
      const allEntries: Array<{ key: string, value: any }> = await invokeListFolder(driveId, '/', true)
      console.log('[DrivePage] full drive entries (recursive)=', allEntries.map(e => e.key))
      const completeTree = buildCompleteFileSystemTree(allEntries)
      setCompleteFileSystem(completeTree)
      
      // Don't auto-expand all folders on refresh - preserve current expansion state
      // const allExpanded = expandAllFolders(completeTree);
      // setExpandedNodes(allExpanded);
    } catch {}
    
    const children = buildNodesForFolder(currentFolderPath, entries)
    console.log('[DrivePage] computed children for', currentFolderPath, children)
    setFileSystem(children)
    
    // Only update current view if we're at the root, otherwise preserve navigation state
    if (currentFolderPath === '/') {
      setCurrentView(children)
      setSelectedNode({ id: 'virtual-root', name: 'Root', type: 'folder', children })
    } else {
      // Update the current view with refreshed children while preserving navigation
      setCurrentView(children)
      // Update the selected node with refreshed children
      if (selectedNode && selectedNode.type === 'folder') {
        setSelectedNode({ ...selectedNode, children })
      }
    }
  }

  function NewFolderModal({ driveId, currentFolder, onCreated, trigger, isOpen, onClose, onOpen }: { driveId: string, currentFolder: string, onCreated: () => Promise<void>, trigger: React.ReactNode, isOpen: boolean, onClose: () => void, onOpen: () => void }) {
    function FormContent() {
      const [name, setName] = useState("");
      const [saving, setSaving] = useState(false);

      async function handleCreate() {
        if (!name.trim()) return;
        const folderPath = currentFolder.endsWith('/') ? currentFolder + name.trim() : currentFolder + '/' + name.trim();
        try {
          setSaving(true);
          await api?.drives?.createFolder?.(driveId, folderPath)
          await onCreated();
          onClose();
          setName(""); // Reset form
        } finally {
          setSaving(false);
        }
      }

      return (
        <>
          <ModalContent>
            <h4 className="text-lg md:text-2xl text-neutral-100 font-bold text-center mb-4">New Folder</h4>
            <p className="text-neutral-400 text-center mb-6">Create a folder under <span className="font-mono text-white/80">{currentFolder || '/'}</span></p>
            <div className="max-w-md mx-auto w-full">
              <label className="block text-left text-white/90 mb-2">Folder name</label>
              <input
                className="w-full rounded-md px-4 py-3 bg-white/10 text-white placeholder-white/50 focus:outline-none"
                placeholder="e.g. Documents"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </ModalContent>
          <ModalFooter className="gap-4">
            <MagicButtonWide
              variant="default"
              onClick={() => {
                onClose();
                setName(""); // Reset form
              }}
            >
              Cancel
            </MagicButtonWide>
            <MagicButtonWide
              variant="green"
              onClick={handleCreate}
              disabled={saving || !name.trim()}
              loading={saving}
            >
              Create
            </MagicButtonWide>
          </ModalFooter>
        </>
      )
    }

    return (
      <>
        <MagicButton
          variant="blue"
          onClick={onOpen}
          className="h-10 flex items-center gap-2 text-sm font-medium"
        >
          {trigger}
        </MagicButton>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/70 bg-opacity-20" onClick={onClose} />
            <div className="relative bg-neutral-950 border border-neutral-800 rounded-2xl max-w-md w-full mx-4">
              <FormContent />
            </div>
          </div>
        )}
      </>
    )
  }
  
  // Breadcrumb navigation state
  const [currentView, setCurrentView] = useState<TreeNode[]>(mockFileSystem);
  const [breadcrumbPath, setBreadcrumbPath] = useState<string[]>([]);
  const [navigationStack, setNavigationStack] = useState<TreeNode[][]>([]);
  const [navigationDirection, setNavigationDirection] = useState<'forward' | 'backward'>('forward');
  const canGoBack = (selectedNode?.type === 'file' && !!lastFocusedFolder) || navigationStack.length > 0 || breadcrumbPath.length > 0;
  
  // Context menu state
  const { isOpen, position, openContextMenu, closeContextMenu } = useContextMenu();
  const [contextActions, setContextActions] = useState<ContextMenuAction[]>([]);

  const handleNodeSelect = (node: TreeNode) => {
    console.log('[DEBUG] handleNodeSelect called with node:', node.name, 'type:', node.type);
    setSelectedNode(node);
    
    // Handle parent navigation (..)
    if (node.name === '..') {
      const parentPath = treeRoot.split('/').slice(0, -1).join('/') || '/';
      setTreeRoot(parentPath);
      return;
    }
    
    // Handle "..." indicator - set parent as new root
    if (node.name === '...' && node.id.includes('__more__')) {
      const parentPath = node.id.replace('/__more__', '');
      setTreeRoot(parentPath);
      return;
    }
    
    // If it's a folder, set it as the new tree root
    if (node.type === 'folder') {
      setTreeRoot(node.id);
    }
  };

  const handleFileClick = async (node: TreeNode) => {
    // Handle parent navigation (..) - same logic as handleNodeSelect
    if (node.name === '..') {
      const parentPath = treeRoot.split('/').slice(0, -1).join('/') || '/';
      handleBreadcrumbClick(parentPath);
      return;
    }
    
    // Handle "..." indicator - set parent as new root
    if (node.name === '...' && node.id.includes('__more__')) {
      const parentPath = node.id.replace('/__more__', '');
      setTreeRoot(parentPath);
      return;
    }
    
    if (node.type === 'folder') {
      // Use the complete file system tree instead of reloading from drive
      const folderNode = findNodeByPath(completeFileSystem, node.id.split('/').filter(Boolean))
      
      if (folderNode && folderNode.children) {
        // Build the correct breadcrumb path from the node's ID
        const pathSegments = node.id.split('/').filter(Boolean);
        
        // Batch all state updates together to prevent flickering
        startTransition(() => {
          setNavigationDirection('forward');
          setNavigationStack((prev) => [...prev, currentView]);
          setCurrentView(folderNode.children || []);
          setSelectedNode({ ...node, children: folderNode.children });
          // Update treeRoot to reflect the current folder for uploads
          setTreeRoot(node.id);
        });
      } else {
        // Fallback: try to load from drive if not found in complete tree
        const driveId = params.driveId as string | undefined
        if (!driveId) return
        
        try {
          const folderPath = node.id.startsWith('/') ? node.id : `/${node.id}`
          const entries: Array<{ key: string, value: any }> = await invokeListFolder(driveId, folderPath, false)
          const children = buildNodesForFolder(folderPath, entries)
          
          // Build the correct breadcrumb path from the node's ID
          const pathSegments = node.id.split('/').filter(Boolean);
          
          startTransition(() => {
            setNavigationDirection('forward');
            setNavigationStack((prev) => [...prev, currentView]);
            setCurrentView(children);
            setSelectedNode({ ...node, children });
            // Update treeRoot to reflect the current folder for uploads
            setTreeRoot(node.id);
          });
        } catch {}
      }
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

  const handleCreateFolderFromTree = (parentPath: string) => {
    // parentPath is either '/' for root or the folder ID for nested folders
    const driveId = params.driveId as string;
    if (!driveId) return;
    
    // Set the current folder path for the new folder modal
    const currentFolderPath = parentPath === '/' ? '/' : parentPath;
    
    // Open the new folder modal with the correct parent path
    setShowNewFolderModal(true);
    
    // We need to pass the parent path to the modal somehow
    // For now, we'll use a state to track the target folder
    setTargetFolderForNewFolder(currentFolderPath);
  };

  const handleCreateFolderWithAutoExpand = async () => {
    // After folder creation, reload the complete file system first to get the updated tree
    const parentPath = targetFolderForNewFolder;
    const parentNodeId = parentPath === '/' ? 'virtual-root' : parentPath;
    
    const driveId = params.driveId as string;
    if (driveId) {
      try {
        // Reload the complete file system to get the updated tree with the new folder
        const allEntries: Array<{ key: string, value: any }> = await invokeListFolder(driveId, '/', true);
        const updatedCompleteTree = buildCompleteFileSystemTree(allEntries);
        setCompleteFileSystem(updatedCompleteTree);
        
        // Auto-expand all folders including the newly created ones
        const allExpanded = expandAllFolders(updatedCompleteTree);
        setExpandedNodes(allExpanded);
        
        // Reload the current folder to show the newly created folder
        await reloadCurrentFolder();
        
        
        // Find the updated parent node with the new folder
        const updatedParentNode = findNodeById(updatedCompleteTree, parentNodeId);
        if (updatedParentNode) {
          // Select the parent folder to show its contents with the new folder
          setSelectedNode(updatedParentNode);
        }
      } catch (error) {
        console.error('Failed to reload complete file system:', error);
        // Fallback: just select the parent node
        const parentNode = findNodeById(completeFileSystem, parentNodeId);
        if (parentNode) {
          setSelectedNode(parentNode);
        }
      }
    }
  };

  const handleGoHome = () => {
    setNavigationDirection('backward');
    setCurrentView(fileSystem);
    setBreadcrumbPath([]);
    setNavigationStack([]);
    setSelectedNode({ id: 'virtual-root', name: 'Root', type: 'folder', children: fileSystem });
    // Reset treeRoot to root for uploads
    setTreeRoot('/');
  };

  const handleOpenSettings = () => {
    console.log("Open Drive Settings");
  };

  const handleOpenProfileSettings = () => {
    console.log("Open Profile Settings");
  };

  const handleNavigateToFolder = async (node: TreeNode) => {
    // TODO: Implement folder navigation
  };

  const handleNavigateUp = () => {
    // TODO: Implement navigate up functionality
  };

  // Dedicated function for content panel ".." navigation (same logic as tree view)
  const handleContentPanelNavigateUp = () => {
    const parentPath = treeRoot.split('/').slice(0, -1).join('/') || '/';
    handleBreadcrumbClick(parentPath);
  };

  const handleBack = () => {
    // If currently previewing a file, go back to its parent folder view
    if (selectedNode?.type === 'file' && lastFocusedFolder) {
      setNavigationDirection('backward');
      setSelectedNode(lastFocusedFolder);
      if (lastFocusedFolder.children) {
        setCurrentView(lastFocusedFolder.children);
      }
      // Update treeRoot to reflect the parent folder for uploads
      setTreeRoot(lastFocusedFolder.id);
      // Ensure breadcrumb reflects the parent folder at the end
      setBreadcrumbPath(prev => {
        const next = [...prev];
        if (next[next.length - 1] !== lastFocusedFolder.name) {
          next.push(lastFocusedFolder.name);
        }
        return next;
      });
      // Clear the last focused folder to avoid repeated overrides
      setLastFocusedFolder(undefined);
      // Do not mutate breadcrumb or navigationStack in this case
      return;
    }
    // Fallback to normal navigate up behavior
    handleNavigateUp();
  };

  const handleFileUpload = async (files: File[]) => {
    const driveId = params.driveId as string | undefined
    if (!driveId || !files?.length) return
    const currentFolderPath = getCurrentFolderPath()
    try {
      const payload = await Promise.all(files.map(async (f) => ({ name: f.name, data: await f.arrayBuffer() })))
      const res = await invokeUploadFiles(driveId, currentFolderPath, payload)
      console.log('[DrivePage] uploaded files result', res)
      await reloadCurrentFolder()
    } catch (e) {
      console.error('[DrivePage] upload failed', e)
    }
  };

  const handleDeleteNode = async (node: TreeNode) => {
    const driveId = params.driveId as string | undefined
    if (!driveId) return
    
    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete "${node.name}"?${node.type === 'folder' ? ' This will delete all contents inside the folder.' : ''}`
    )
    
    if (!confirmed) return
    
    try {
      const success = await invokeDeleteFile(driveId, node.id)
      if (success) {
        console.log('[DrivePage] successfully deleted:', node.name)
        // Reload the current folder to refresh the view
        await reloadCurrentFolder()
        // If we deleted the currently selected node, clear the selection
        if (selectedNode?.id === node.id) {
          setSelectedNode(undefined)
        }
      } else {
        console.error('[DrivePage] failed to delete:', node.name)
        alert('Failed to delete the item. Please try again.')
      }
    } catch (e) {
      console.error('[DrivePage] delete failed', e)
      alert('An error occurred while deleting the item. Please try again.')
    }
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

  // Expand all folders recursively
  const expandAllFolders = (nodes: TreeNode[]): Set<string> => {
    const expanded = new Set<string>();
    const traverse = (nodeList: TreeNode[]) => {
      nodeList.forEach(node => {
        if (node.type === 'folder' && node.children && node.children.length > 0) {
          expanded.add(node.id);
          traverse(node.children);
        }
      });
    };
    traverse(nodes);
    return expanded;
  };

  // Collapse all folders
  const collapseAllFolders = () => {
    setExpandedNodes(new Set());
  };

  const handleExpandAll = () => {
    const allExpanded = expandAllFolders(getCurrentTreeData());
    setExpandedNodes(allExpanded);
  };

  const handleCollapseAll = () => {
    collapseAllFolders();
  };

  // Process tree nodes with depth limit and "..." indicator
  const processTreeNodes = (nodes: TreeNode[], currentDepth: number = 0, maxDepth: number = 8): TreeNode[] => {
    if (currentDepth >= maxDepth) {
      return [];
    }
    
    return nodes.map(node => {
      const processedNode: TreeNode = {
        ...node,
        children: node.children ? processTreeNodes(node.children, currentDepth + 1, maxDepth) : []
      };
      
      // If we're at max depth and there are more children, add "..." indicator
      if (currentDepth === maxDepth - 1 && node.children && node.children.length > 0) {
        const moreIndicator: TreeNode = {
          id: `${node.id}/__more__`,
          name: '...',
          type: 'folder',
          children: []
        };
        processedNode.children = [moreIndicator];
      }
      
      return processedNode;
    });
  };

  // Get current tree data based on tree root (without ".." navigation)
  const getCurrentTreeData = (): TreeNode[] => {
    if (treeRoot === '/') {
      return processTreeNodes(completeFileSystem);
    }
    
    // Find the node at the tree root
    const rootNode = findNodeById(completeFileSystem, treeRoot);
    if (!rootNode || !rootNode.children) {
      return []; // Return empty array for fallback
    }
    
    return processTreeNodes(rootNode.children);
  };

  // Check if current folder is actually empty (no real children, only "..")
  const isCurrentFolderEmpty = (): boolean => {
    if (treeRoot === '/') {
      return completeFileSystem.length === 0;
    }
    
    const rootNode = findNodeById(completeFileSystem, treeRoot);
    return !rootNode || !rootNode.children || rootNode.children.length === 0;
  };

  // Truncate text helper
  const truncateText = (text: string, maxLength: number = 12): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  };

  // Get smart breadcrumb path for current tree root
  const getBreadcrumbPath = (): Array<{ name: string; path: string; isEllipsis?: boolean; isHome?: boolean; hiddenParents?: Array<{ name: string; path: string }> }> => {
    if (treeRoot === '/') {
      return [{ name: 'Root', path: '/', isHome: true }];
    }
    
    const pathParts = treeRoot.split('/').filter(Boolean);
    const breadcrumb: Array<{ name: string; path: string; isEllipsis?: boolean; isHome?: boolean; hiddenParents?: Array<{ name: string; path: string }> }> = [
      { name: 'Root', path: '/', isHome: true }
    ];
    
    // If path is short (3 or fewer parts), show all
    if (pathParts.length <= 3) {
      let currentPath = '';
      for (const part of pathParts) {
        currentPath += `/${part}`;
        breadcrumb.push({ name: truncateText(part), path: currentPath });
      }
      return breadcrumb;
    }
    
    // For long paths, show: Home > ... > parent > current
    const currentPath = treeRoot;
    const parentPath = treeRoot.split('/').slice(0, -1).join('/') || '/';
    const parentName = pathParts[pathParts.length - 2];
    const currentName = pathParts[pathParts.length - 1];
    
    // Collect hidden parent folders for tooltip
    const hiddenParents: Array<{ name: string; path: string }> = [];
    let currentHiddenPath = '';
    for (let i = 0; i < pathParts.length - 2; i++) {
      currentHiddenPath += `/${pathParts[i]}`;
      hiddenParents.push({ name: pathParts[i], path: currentHiddenPath });
    }
    
    breadcrumb.push(
      { name: '...', path: '', isEllipsis: true, hiddenParents },
      { name: truncateText(parentName), path: parentPath },
      { name: truncateText(currentName), path: currentPath }
    );
    
    return breadcrumb;
  };

  // Handle breadcrumb navigation
  const handleBreadcrumbClick = (path: string) => {
    setTreeRoot(path);
    
    // Find and select the node we're navigating to
    if (path === '/') {
      // If navigating to root, create a virtual root node with all root-level children
      const rootChildren = completeFileSystem.filter(node => node.id.startsWith('/') && !node.id.slice(1).includes('/'));
      setSelectedNode({ 
        id: 'virtual-root', 
        name: 'Root', 
        type: 'folder', 
        children: rootChildren 
      });
      
      // Also update the navigation state to show root contents
      setCurrentView(rootChildren);
      setBreadcrumbPath([]);
      setNavigationStack([]);
      setNavigationDirection('forward');
    } else {
      // Find the specific node we're navigating to
      const targetNode = findNodeById(completeFileSystem, path);
      if (targetNode) {
        setSelectedNode(targetNode);
        
        // Update navigation state for the specific path
        if (targetNode.type === 'folder' && targetNode.children) {
          setCurrentView(targetNode.children);
          
          // Build breadcrumb path from the target path
          const pathSegments = path.split('/').filter(Boolean);
          setBreadcrumbPath(pathSegments);
        }
      }
    }
  };

  // Handle ellipsis hover with delay
  const handleEllipsisMouseEnter = () => {
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      setHideTimeout(null);
    }
    setHoveredEllipsis(true);
  };

  const handleEllipsisMouseLeave = () => {
    const timeout = setTimeout(() => {
      setHoveredEllipsis(false);
    }, 150); // 150ms delay
    setHideTimeout(timeout);
  };


  const handleQuickAction = (action: typeof quickActions[0]) => {
    console.log("Quick action:", action.label);
    // Handle quick actions
  };

  // Helper: find a node by path of names (from root)
  const findNodeByPath = (nodes: TreeNode[], names: string[]): TreeNode | null => {
    let currentNodes: TreeNode[] = nodes;
    let found: TreeNode | null = null;
    for (const name of names) {
      found = (currentNodes || []).find(n => n.name === name) || null;
      if (!found) return null;
      currentNodes = found.children || [];
    }
    return found;
  };

  // Helper: find a node by its ID in the complete file system tree
  const findNodeById = (nodes: TreeNode[], targetId: string): TreeNode | null => {
    for (const node of nodes) {
      if (node.id === targetId) return node;
      if (node.children) {
        const found = findNodeById(node.children, targetId);
        if (found) return found;
      }
    }
    return null;
  };







  const handleSearchSelect = (node: TreeNode, pathNames: string[]) => {
    // pathNames includes the file name; folders are pathNames.slice(0,-1)
    const folderPath = pathNames.slice(0, -1);
    const folderNode = folderPath.length > 0 ? findNodeByPath(completeFileSystem, folderPath) : { id: 'virtual-root', name: 'Root', type: 'folder' as const, children: completeFileSystem } as TreeNode;

    // Set view to the folder containing the file
    if (folderNode && folderNode.type === 'folder') {
      // Preserve current navigation state for back button functionality
      setNavigationStack(prev => [...prev, currentView]);
      setCurrentView(folderNode.children || []);
      setBreadcrumbPath(folderPath);
      setLastFocusedFolder(folderNode);
      // Update treeRoot to reflect the folder containing the file for uploads
      setTreeRoot(folderNode.id);
    }
    // Select the file itself
    setSelectedNode(node);
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
              {/* Brand - Shuffle */}
              <div className="flex items-center justify-center w-full mb-4 flex-shrink-0">
                <Shuffle
                  text="Hyperdrive"
                  shuffleDirection="right"
                  duration={0.35}
                  animationMode="evenodd"
                  shuffleTimes={1}
                  loop={false}
                  ease="power3.out"
                  stagger={0.03}
                  threshold={0.1}
                  triggerOnce={true}
                  triggerOnHover={true}
                  respectReducedMotion={true}
                  useDefaultFont={false}
                  tag="div"
                  style={{ fontSize: "1.125rem", lineHeight: "1.75rem", fontFamily: "Electrolize, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial" }}
                  className="text-white cursor-pointer font-electrolize"
                />
              </div>

              {/* Navigation Links removed as requested */}

              {/* File Tree - Scrollable */}
              <div className="flex-1 min-h-0">
                <div className="h-full flex flex-col">
                  <div className="mb-2 flex-shrink-0 flex items-center justify-center gap-2">
                    <DelayedTooltip description="Navigate to drives overview">
                      <button
                        onClick={() => navigate('/drives')}
                        className="p-2 rounded-full bg-black/40 border border-white/15 hover:bg-black/60 text-white transition-colors shadow-lg"
                      >
                        <HardDriveIcon size={18} />
                      </button>
                    </DelayedTooltip>
                    <DelayedTooltip description="Configure drive preferences and options">
                      <button
                        onClick={handleOpenSettings}
                        className="p-2 rounded-full bg-black/40 border border-white/15 hover:bg-black/60 text-white transition-colors shadow-lg"
                      >
                        <IconSettings size={18} />
                      </button>
                    </DelayedTooltip>
                    <DelayedTooltip description="Manage your user profile and account">
                      <button
                        onClick={handleOpenProfileSettings}
                        className="p-2 rounded-full bg-black/40 border border-white/15 hover:bg-black/60 text-white transition-colors shadow-lg"
                      >
                        <IconUser size={18} />
                      </button>
                    </DelayedTooltip>
                  </div>
                  <div className="flex-1 min-h-0 flex flex-col">
                    {/* Breadcrumb */}
                    <div className="p-1.5 border-b border-neutral-700">
                      <nav className="flex items-center space-x-0.5 text-xs">
                        {getBreadcrumbPath().map((item, index) => (
                          <div key={item.path || `ellipsis-${index}`} className="flex items-center">
                            {index > 0 && (
                              <svg className="w-2.5 h-2.5 mx-0.5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            )}
                            {item.isEllipsis ? (
                              <div 
                                className="relative"
                                onMouseEnter={handleEllipsisMouseEnter}
                                onMouseLeave={handleEllipsisMouseLeave}
                              >
                                <span className="px-2 py-0.5 text-neutral-500 cursor-help">
                                  {item.name}
                                </span>
                                {item.hiddenParents && item.hiddenParents.length > 0 && hoveredEllipsis && (
                                  <div 
                                    className="absolute top-full left-0 mt-2 z-50"
                                    onMouseEnter={handleEllipsisMouseEnter}
                                    onMouseLeave={handleEllipsisMouseLeave}
                                  >
                                    <div className="bg-black/70 shadow-lg p-2 min-w-40 max-w-48">
                                      <div className="text-xs text-neutral-300 mb-2 font-medium">Navigate to:</div>
                                      <div className="space-y-1">
                                        {item.hiddenParents.map((parent, idx) => (
                                          <button
                                            key={parent.path}
                                            onClick={() => {
                                              handleBreadcrumbClick(parent.path);
                                              setHoveredEllipsis(false);
                                            }}
                                            className="block w-full text-left px-3 py-2 text-xs text-neutral-400 hover:text-white hover:bg-black/50 transition-colors"
                                            title={`Navigate to ${parent.name}`}
                                          >
                                            <div className="flex items-center gap-2">
                                              <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                                              </svg>
                                              <span className="truncate">{parent.name}</span>
                                            </div>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <button
                                onClick={() => handleBreadcrumbClick(item.path)}
                                className={`px-2 py-0.5 rounded hover:bg-black/20 transition-colors flex items-center gap-1 max-w-20 truncate ${
                                  item.path === treeRoot ? 'bg-blue-500/20 text-blue-400 font-medium' : 'text-neutral-400 hover:text-white'
                                }`}
                                title={item.path === '/' ? 'Drive Root' : item.path.split('/').pop()}
                              >
                                {item.isHome ? (
                                  <div className="flex items-center gap-1">
                                    <HardDriveIcon size={12} />
                                    <span>{item.name}</span>
                                  </div>
                                ) : (
                                  item.name
                                )}
                              </button>
                            )}
                          </div>
                        ))}
                        </nav>
                      </div>

                    {/* Tree Controls */}
                    <div className="flex items-center justify-between p-2 border-b border-neutral-700">
                      <div className="flex items-center gap-2">
                        <DelayedTooltip description="Expand all folders in the current view">
                          <button
                            onClick={handleExpandAll}
                            className="p-1.5 rounded hover:bg-black/20 text-neutral-400 hover:text-white transition-colors"
                          >
                            <img src={ExpandAllIcon} alt="Expand All" className="w-4 h-4" />
                          </button>
                        </DelayedTooltip>
                        <DelayedTooltip description="Collapse all folders in the current view">
                          <button
                            onClick={handleCollapseAll}
                            className="p-1.5 rounded hover:bg-black/20 text-neutral-400 hover:text-white transition-colors"
                          >
                            <img src={CollapseAllIcon} alt="Collapse All" className="w-4 h-4" />
                          </button>
                        </DelayedTooltip>
                      </div>
                    </div>

                    {/* Tree View */}
                    <div className="flex-1 min-h-0 flex flex-col">
                      {/* Show ".." navigation if not at root */}
                      {treeRoot !== '/' && (
                        <div className="p-2 border-b border-neutral-700">
                          <DelayedTooltip description="Navigate to the parent folder">
                            <button
                              onClick={() => {
                                const parentPath = treeRoot.split('/').slice(0, -1).join('/') || '/';
                                handleBreadcrumbClick(parentPath);
                              }}
                              className="flex items-center gap-2 w-full px-3 py-2 text-left text-neutral-400 hover:text-white hover:bg-black/20 rounded transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                              </svg>
                              <span className="text-sm">..</span>
                            </button>
                          </DelayedTooltip>
                        </div>
                      )}
                      
                      {/* Show content or empty state */}
                      <div className="flex-1 min-h-0">
                        {isCurrentFolderEmpty() ? (
                          <div className="flex flex-col items-center justify-center h-full text-neutral-500 p-4">
                            <svg className="w-12 h-12 mb-3 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                            </svg>
                            <div className="text-sm font-medium mb-1">This folder is empty</div>
                            <div className="text-xs text-neutral-600 text-center">
                              {treeRoot === '/' ? 'Create folders or upload files to get started' : 'No files or folders in this directory'}
                            </div>
                          </div>
                        ) : (
                          <TreeView
                            data={getCurrentTreeData()}
                            onNodeSelect={handleNodeSelect}
                            onNodeToggle={handleNodeToggle}
                            selectedNodeId={selectedNode?.id}
                            expandedNodes={expandedNodes}
                            onContextMenu={handleContextMenu}
                            onNavigateUp={handleNavigateUp}
                            onNavigateToFolder={handleNavigateToFolder}
                            showBreadcrumb={false}
                            breadcrumbPath={[]}
                            navigationDirection={navigationDirection}
                            onCreateFolder={handleCreateFolderFromTree}
                            onRefresh={reloadCurrentFolder}
                            onDelete={handleDeleteNode}
                          />
                        )}
                      </div>
                    </div>
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
            <div className="flex items-center justify-end">
              <div className="flex items-center gap-4">
                {/* Quick Actions */}
                <div className="flex items-center gap-2">
                  {/* Search Button (left of New Folder) */}
                  <FileSearchModal
                    fileSystem={completeFileSystem}
                    onSelect={handleSearchSelect}
                    triggerButton={
                      <button
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-400 hover:bg-black/20 hover:text-white transition-colors rounded-lg"
                        title="Search Files"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="11" cy="11" r="8"></circle>
                          <path d="m21 21-4.3-4.3"></path>
                        </svg>
                        <span>Search</span>
                      </button>
                    }
                  />
                  <button
                    onClick={reloadCurrentFolder}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-400 hover:bg-black/20 hover:text-white transition-colors rounded-lg"
                    title="Refresh"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12a9 9 0 1 1-3-6.708"/>
                      <path d="M21 3v6h-6"/>
                    </svg>
                    <span>Refresh</span>
                  </button>
                  {/* Share Button */}
                  {currentDrive && (
                    <ShareModal
                      driveKey={currentDrive.driveKey}
                      driveName={currentDrive.name}
                      triggerButton={
                        <button
                          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-400 hover:bg-black/20 hover:text-white transition-colors rounded-lg"
                          title="Share Drive"
                        >
                          <IconShare size={16} />
                          <span>Share</span>
                        </button>
                      }
                    />
                  )}
                  {(() => {
                    const driveId = params.driveId as string
                    const currentFolderPath = getCurrentFolderPath()
                    return (
                      <NewFolderModal
                        driveId={driveId}
                        currentFolder={targetFolderForNewFolder}
                        onCreated={handleCreateFolderWithAutoExpand}
                        isOpen={showNewFolderModal}
                        onClose={() => {
                          setShowNewFolderModal(false);
                          setTargetFolderForNewFolder('/'); // Reset to root
                        }}
                        onOpen={() => {
                          setShowNewFolderModal(true);
                          setTargetFolderForNewFolder(getCurrentFolderPath()); // Set to current folder
                        }}
                        trigger={
                          <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 8l4-4h4l2 2h6v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                              <path d="M12 11v6" />
                              <path d="M9 14h6" />
                            </svg>
                            <span>New Folder</span>
                          </>
                        }
                      />
                    )
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Content Panel */}
          <ContentPanel 
            selectedNode={selectedNode} 
            onFileClick={handleFileClick}
            onNavigateUp={handleContentPanelNavigateUp}
            canNavigateUp={treeRoot !== '/'}
            driveId={params.driveId as string}
            onFileDeleted={reloadCurrentFolder}
            onCreateFolder={handleCreateFolderFromTree}
            onRefresh={reloadCurrentFolder}
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
