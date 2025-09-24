"use client";
import { useEffect, useMemo, useState, startTransition } from "react";
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
// Removed dummy data usage
import Shuffle from "../../../../components/ui/Shuffle";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalTrigger, useModal } from "../../../../components/ui/animated-modal";
import { MagicButton } from "../common/MagicButton";
import MagicButtonWide from "../../../../components/ui/magic-button-wide";

// Start empty; will load from Hyperdrive via IPC
const mockFileSystem: TreeNode[] = [];

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
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
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

  // Load folder listing for this drive
  useEffect(() => {
    let mounted = true;
    async function loadRoot() {
      try {
        const driveId = params.driveId as string | undefined;
        if (!driveId) return;
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
      } catch {}
    }
    loadRoot();
    return () => { mounted = false };
  }, [api, params.driveId]);

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

  function getCurrentFolderPath(): string {
    const names = breadcrumbPath.filter((n) => n && n !== 'Root')
    return names.length > 0 ? '/' + names.join('/') : '/'
  }

  async function reloadCurrentFolder() {
    const driveId = params.driveId as string | undefined;
    if (!driveId) return;
    const currentFolderPath = getCurrentFolderPath()
    const entries: Array<{ key: string, value: any }> = await invokeListFolder(driveId, currentFolderPath, false)
    console.log('[DrivePage] reload entries for', currentFolderPath, entries)
    try {
      const allEntries: Array<{ key: string, value: any }> = await invokeListFolder(driveId, '/', true)
      console.log('[DrivePage] full drive entries (recursive)=', allEntries.map(e => e.key))
    } catch {}
    const children = buildNodesForFolder(currentFolderPath, entries)
    console.log('[DrivePage] computed children for', currentFolderPath, children)
    setFileSystem(children)
    setCurrentView(children)
    setSelectedNode({ id: 'virtual-root', name: currentFolderPath === '/' ? 'Root' : currentFolderPath.split('/').filter(Boolean).slice(-1)[0] || 'Root', type: 'folder', children })
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
                className="w-full rounded-md px-4 py-3 bg-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/40"
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
            >
              {saving ? 'Creating...' : 'Create'}
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
  const canGoBack = (selectedNode?.type === 'file' && !!lastFocusedFolder) || navigationStack.length > 0 || breadcrumbPath.length > 0;
  
  // Context menu state
  const { isOpen, position, openContextMenu, closeContextMenu } = useContextMenu();
  const [contextActions, setContextActions] = useState<ContextMenuAction[]>([]);

  const handleNodeSelect = (node: TreeNode) => {
    setSelectedNode(node);
  };

  const handleFileClick = async (node: TreeNode) => {
    if (node.type === 'folder') {
      const driveId = params.driveId as string | undefined
      if (!driveId) return
      
      try {
        // Load folder contents from IPC first
        const folderPath = node.id.startsWith('/') ? node.id : `/${node.id}`
        const entries: Array<{ key: string, value: any }> = await invokeListFolder(driveId, folderPath, false)
        const children = buildNodesForFolder(folderPath, entries)
        
        // Batch all state updates together to prevent flickering
        startTransition(() => {
          setNavigationDirection('forward');
          setNavigationStack((prev) => [...prev, currentView]);
          setBreadcrumbPath((prev) => [...prev, node.name]);
          setCurrentView(children);
          setExpandedNodes(new Set());
          setSelectedNode({ ...node, children });
        });
      } catch {}
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

  const handleNavigateToFolder = async (node: TreeNode) => {
    setNavigationDirection('forward');
    const driveId = params.driveId as string | undefined
    if (!driveId) return
    try {
      setNavigationStack(prev => [...prev, currentView])
      setBreadcrumbPath(prev => [...prev, node.name])
      const folderPath = node.id.startsWith('/') ? node.id : `/${node.id}`
      const entries: Array<{ key: string, value: any }> = await invokeListFolder(driveId, folderPath, false)
      const children = buildNodesForFolder(folderPath, entries)
      setCurrentView(children)
      setExpandedNodes(new Set())
      setSelectedNode({ ...node, children })
    } catch {}
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
      setNavigationStack([]);
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
      setNavigationStack([]);
      setExpandedNodes(new Set());
      setSelectedNode({ id: 'virtual-root', name: 'Root', type: 'folder', children: fileSystem });
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

  const handleSearchSelect = (node: TreeNode, pathNames: string[]) => {
    // pathNames includes the file name; folders are pathNames.slice(0,-1)
    const folderPath = pathNames.slice(0, -1);
    const folderNode = folderPath.length > 0 ? findNodeByPath(fileSystem, folderPath) : { id: 'virtual-root', name: 'Root', type: 'folder' as const, children: fileSystem } as TreeNode;

    // Set view to the folder containing the file
    if (folderNode && folderNode.type === 'folder') {
      setCurrentView(folderNode.children || []);
      setBreadcrumbPath(folderPath);
      setNavigationStack([]);
      setExpandedNodes(new Set());
      setLastFocusedFolder(folderNode);
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
                <div className="flex items-center gap-2">
                  {/* Search Button (left of New Folder) */}
                  <FileSearchModal
                    fileSystem={fileSystem}
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
                  {(() => {
                    const driveId = params.driveId as string
                    const currentFolderPath = getCurrentFolderPath()
                    return (
                      <NewFolderModal
                        driveId={driveId}
                        currentFolder={currentFolderPath}
                        onCreated={reloadCurrentFolder}
                        isOpen={showNewFolderModal}
                        onClose={() => setShowNewFolderModal(false)}
                        onOpen={() => setShowNewFolderModal(true)}
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
            onNavigateUp={handleBack}
            canNavigateUp={canGoBack}
            driveId={params.driveId as string}
            onFileDeleted={reloadCurrentFolder}
            onCreateFolder={(parentPath) => {
              setShowNewFolderModal(true);
            }}
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
