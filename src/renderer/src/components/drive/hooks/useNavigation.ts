import { useCallback } from 'react'
import { TreeNode } from '../types'
import { findNodeById, findNodeByPath } from '../utils/fileSystemUtils'
import { DriveApiService } from '../services/driveApiService'

interface UseNavigationProps {
  completeFileSystem: TreeNode[]
  currentView: TreeNode[]
  navigationStack: TreeNode[][]
  treeRoot: string
  selectedNode: TreeNode | undefined
  lastFocusedFolder: TreeNode | undefined
  onUpdateState: (updates: any) => void
  onSetTreeRoot: (path: string) => void
  onSetSelectedNode: (node: TreeNode | undefined) => void
  driveId: string | undefined
}

export function useNavigation({
  completeFileSystem,
  currentView,
  navigationStack,
  treeRoot,
  selectedNode,
  lastFocusedFolder,
  onUpdateState,
  onSetTreeRoot,
  onSetSelectedNode,
  driveId
}: UseNavigationProps) {

  const handleNodeSelect = useCallback((node: TreeNode) => {
    onSetSelectedNode(node)
    
    // Handle parent navigation (..)
    if (node.name === '..') {
      const parentPath = treeRoot.split('/').slice(0, -1).join('/') || '/'
      onSetTreeRoot(parentPath)
      return
    }
    
    // Handle "..." indicator - set parent as new root
    if (node.name === '...' && node.id.includes('__more__')) {
      const parentPath = node.id.replace('/__more__', '')
      onSetTreeRoot(parentPath)
      return
    }
    
    // If it's a folder, set it as the new tree root
    if (node.type === 'folder') {
      onSetTreeRoot(node.id)
    }
  }, [treeRoot, onSetSelectedNode, onSetTreeRoot])

  const handleFileClick = useCallback(async (node: TreeNode) => {
    // Handle parent navigation (..) - same logic as handleNodeSelect
    if (node.name === '..') {
      const parentPath = treeRoot.split('/').slice(0, -1).join('/') || '/'
      handleBreadcrumbClick(parentPath)
      return
    }
    
    // Handle "..." indicator - set parent as new root
    if (node.name === '...' && node.id.includes('__more__')) {
      const parentPath = node.id.replace('/__more__', '')
      onSetTreeRoot(parentPath)
      return
    }
    
    if (node.type === 'folder') {
      // Use the complete file system tree instead of reloading from drive
      const folderNode = findNodeByPath(completeFileSystem, node.id.split('/').filter(Boolean))
      
      if (folderNode && folderNode.children) {
        // Build the correct breadcrumb path from the node's ID
        const pathSegments = node.id.split('/').filter(Boolean)
        
        // Batch all state updates together to prevent flickering
        onUpdateState({
          navigationDirection: 'forward',
          navigationStack: [...navigationStack, currentView],
          currentView: folderNode.children || [],
          selectedNode: { ...node, children: folderNode.children },
          treeRoot: node.id
        })
      } else {
        // Fallback: try to load from drive if not found in complete tree
        if (!driveId) return
        
        try {
          const folderPath = node.id.startsWith('/') ? node.id : `/${node.id}`
          const entries = await DriveApiService.listFolder(driveId, folderPath, false)
          const children = buildNodesForFolder(folderPath, entries)
          
          // Build the correct breadcrumb path from the node's ID
          const pathSegments = node.id.split('/').filter(Boolean)
          
          onUpdateState({
            navigationDirection: 'forward',
            navigationStack: [...navigationStack, currentView],
            currentView: children,
            selectedNode: { ...node, children },
            treeRoot: node.id
          })
        } catch (error) {
          // Failed to load folder
        }
      }
    } else {
      // Capture the parent folder context when previewing a file
      if (selectedNode?.type === 'folder') {
        onUpdateState({ lastFocusedFolder: selectedNode })
      }
      onSetSelectedNode(node)
    }
  }, [treeRoot, completeFileSystem, navigationStack, currentView, selectedNode, driveId, onSetTreeRoot, onSetSelectedNode, onUpdateState])

  const handleBreadcrumbClick = useCallback((path: string) => {
    onSetTreeRoot(path)
    
    // Find and select the node we're navigating to
    if (path === '/') {
      // If navigating to root, create a virtual root node with all root-level children
      const rootChildren = completeFileSystem.filter(node => 
        node.id.startsWith('/') && !node.id.slice(1).includes('/')
      )
      onSetSelectedNode({ 
        id: 'virtual-root', 
        name: 'Root', 
        type: 'folder', 
        children: rootChildren 
      })
      
      // Also update the navigation state to show root contents
      onUpdateState({
        currentView: rootChildren,
        breadcrumbPath: [],
        navigationStack: [],
        navigationDirection: 'forward'
      })
    } else {
      // Find the specific node we're navigating to
      const targetNode = findNodeById(completeFileSystem, path)
      if (targetNode) {
        onSetSelectedNode(targetNode)
        
        // Update navigation state for the specific path
        if (targetNode.type === 'folder' && targetNode.children) {
          onUpdateState({
            currentView: targetNode.children,
            breadcrumbPath: path.split('/').filter(Boolean)
          })
        }
      }
    }
  }, [completeFileSystem, onSetTreeRoot, onSetSelectedNode, onUpdateState])

  const handleNavigateToFolder = useCallback(async (node: TreeNode) => {
    if (node.type !== 'folder') return
    // Prefer complete tree data for immediate navigation without refetch
    const folderNode = findNodeById(completeFileSystem, node.id)
    if (folderNode && folderNode.children) {
      onUpdateState({
        navigationDirection: 'forward',
        navigationStack: [...navigationStack, currentView],
        currentView: folderNode.children || [],
        selectedNode: folderNode,
        treeRoot: folderNode.id,
        breadcrumbPath: folderNode.id.split('/').filter(Boolean)
      })
      return
    }
    // Fallback: try to load from backend
    if (!driveId) return
    try {
      const folderPath = node.id.startsWith('/') ? node.id : `/${node.id}`
      const entries = await DriveApiService.listFolder(driveId, folderPath, false)
      const children = buildNodesForFolder(folderPath, entries)
      onUpdateState({
        navigationDirection: 'forward',
        navigationStack: [...navigationStack, currentView],
        currentView: children,
        selectedNode: { ...node, children },
        treeRoot: folderPath,
        breadcrumbPath: folderPath.split('/').filter(Boolean)
      })
    } catch (error) {
      // Failed to load folder
    }
  }, [completeFileSystem, navigationStack, currentView, driveId, onUpdateState])

  const handleBack = useCallback(() => {
    // If currently previewing a file, go back to its parent folder view
    if (selectedNode?.type === 'file' && lastFocusedFolder) {
      onUpdateState({
        navigationDirection: 'backward',
        selectedNode: lastFocusedFolder,
        currentView: lastFocusedFolder.children || [],
        treeRoot: lastFocusedFolder.id,
        lastFocusedFolder: undefined
      })
      return
    }
    // Fallback to normal navigate up behavior
    // TODO: Implement navigate up functionality
  }, [selectedNode, lastFocusedFolder, onUpdateState])

  const handleSearchSelect = useCallback((node: TreeNode, pathNames: string[]) => {
    // pathNames includes the file name; folders are pathNames.slice(0,-1)
    const folderPath = pathNames.slice(0, -1)
    const folderNode = folderPath.length > 0 
      ? findNodeByPath(completeFileSystem, folderPath) 
      : { id: 'virtual-root', name: 'Root', type: 'folder' as const, children: completeFileSystem } as TreeNode

    // Set view to the folder containing the file
    if (folderNode && folderNode.type === 'folder') {
      // Preserve current navigation state for back button functionality
      onUpdateState({
        navigationStack: [...navigationStack, currentView],
        currentView: folderNode.children || [],
        breadcrumbPath: folderPath,
        lastFocusedFolder: folderNode,
        treeRoot: folderNode.id
      })
    }
    // Select the file itself
    onSetSelectedNode(node)
  }, [completeFileSystem, navigationStack, currentView, onUpdateState, onSetSelectedNode])

  return {
    handleNodeSelect,
    handleFileClick,
    handleBreadcrumbClick,
    handleNavigateToFolder,
    handleBack,
    handleSearchSelect,
  }
}

// Helper function to build nodes for folder
function buildNodesForFolder(currentFolderPath: string, entries: any[]): TreeNode[] {
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
  
  const folders: TreeNode[] = Array.from(folderNames).map((name) => ({ 
    id: normalized + name, 
    name, 
    type: 'folder', 
    children: [] 
  }))
  
  // Stable sort: folders first, then files, both A→Z
  folders.sort((a, b) => a.name.localeCompare(b.name))
  files.sort((a, b) => a.name.localeCompare(b.name))
  return [...folders, ...files]
}
