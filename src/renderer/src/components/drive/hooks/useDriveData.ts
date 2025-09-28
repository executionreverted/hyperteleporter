import { useEffect, useCallback, useRef } from 'react'
import { DriveApiService } from '../services/driveApiService'
import { buildNodesForFolder, buildCompleteFileSystemTree, findNodeById, expandAllFolders } from '../utils/fileSystemUtils'
import { TreeNode, DriveInfo } from '../types'

interface UseDriveDataProps {
  driveId: string | undefined
  completeFileSystem: TreeNode[]
  treeRoot: string
  onSetFileSystem: (fileSystem: TreeNode[]) => void
  onSetCompleteFileSystem: (completeFileSystem: TreeNode[]) => void
  onSetCurrentDrive: (drive: DriveInfo | null) => void
  onSetExpandedNodes: (expanded: Set<string>) => void
  onUpdateState: (updates: any) => void
  onSetSelectedNode: (node: TreeNode | undefined) => void
}

export function useDriveData({
  driveId,
  completeFileSystem,
  treeRoot,
  onSetFileSystem,
  onSetCompleteFileSystem,
  onSetCurrentDrive,
  onSetExpandedNodes,
  onUpdateState,
  onSetSelectedNode
}: UseDriveDataProps) {
  const hasAutoExpandedRef = useRef(false)
  
  // Store callbacks in refs to avoid dependency issues
  const onSetFileSystemRef = useRef(onSetFileSystem)
  const onSetCompleteFileSystemRef = useRef(onSetCompleteFileSystem)
  const onSetCurrentDriveRef = useRef(onSetCurrentDrive)
  const onSetExpandedNodesRef = useRef(onSetExpandedNodes)
  const onUpdateStateRef = useRef(onUpdateState)
  const onSetSelectedNodeRef = useRef(onSetSelectedNode)
  
  // Update refs when callbacks change
  onSetFileSystemRef.current = onSetFileSystem
  onSetCompleteFileSystemRef.current = onSetCompleteFileSystem
  onSetCurrentDriveRef.current = onSetCurrentDrive
  onSetExpandedNodesRef.current = onSetExpandedNodes
  onUpdateStateRef.current = onUpdateState
  onSetSelectedNodeRef.current = onSetSelectedNode

  // Load drive information
  useEffect(() => {
    let mounted = true
    
    async function loadDriveInfo() {
      try {
        if (!driveId) return
        
        const drives = await DriveApiService.getDrives()
        if (!mounted) return
        
        const currentDriveInfo = drives.find((d: any) => d.id === driveId)
        if (currentDriveInfo) {
          const type = currentDriveInfo.type ?? 'owned'
          const isWritable = type === 'owned'
          onSetCurrentDriveRef.current({
            id: currentDriveInfo.id,
            name: currentDriveInfo.name,
            driveKey: currentDriveInfo.publicKeyHex,
            type,
            isWritable
          })
        }
      } catch (error) {
        // Failed to load drive info
      }
    }
    
    loadDriveInfo()
    return () => { mounted = false }
  }, [driveId])

  // Load folder listing for this drive
  useEffect(() => {
    let mounted = true
    
    async function loadRoot() {
      try {
        if (!driveId) return
        
        // Load root folder contents for current view
        const entries = await DriveApiService.listFolder(driveId, '/', false)
        if (!mounted) return
        
        const rootChildren = await buildNodesForFolder('/', entries, driveId)
        onSetFileSystemRef.current(rootChildren)
        onUpdateStateRef.current({ 
          currentView: rootChildren,
          selectedNode: { id: 'virtual-root', name: 'Root', type: 'folder', children: rootChildren },
          navigationDirection: 'forward',
          navigationStack: [],
          breadcrumbPath: [],
          lastFocusedFolder: undefined
        })
        
        // Load complete file system for search
        const allEntries = await DriveApiService.listFolder(driveId, '/', true)
        if (!mounted) return
        
        const completeTree = buildCompleteFileSystemTree(allEntries)
        onSetCompleteFileSystemRef.current(completeTree)
        
      } catch (error) {
        // Failed to load drive contents
      }
    }
    
    loadRoot()
    return () => { mounted = false }
  }, [driveId])

  // Auto-expand all folders only once on first full load
  useEffect(() => {
    if (hasAutoExpandedRef.current) return
    if (completeFileSystem.length > 0) {
      hasAutoExpandedRef.current = true
      const allExpanded = expandAllFolders(completeFileSystem)
      onSetExpandedNodesRef.current(allExpanded)
    }
  }, [completeFileSystem])

  // Keep right panel (currentView) in sync with the tree data and current treeRoot
  useEffect(() => {
    if (treeRoot === '/') {
      const rootChildren = completeFileSystem.filter(node => 
        node.id.startsWith('/') && !node.id.slice(1).includes('/')
      )
      onUpdateStateRef.current({ currentView: rootChildren })
      // Always set virtual root node for root path
      onSetSelectedNodeRef.current({ id: 'virtual-root', name: 'Root', type: 'folder', children: rootChildren })
      return
    }
    
    const folderNode = findNodeById(completeFileSystem, treeRoot)
    if (folderNode && folderNode.children) {
      onUpdateStateRef.current({ currentView: folderNode.children })
      // Always set the folder node for non-root paths
      onSetSelectedNodeRef.current(folderNode)
    }
  }, [completeFileSystem, treeRoot])

  const reloadCurrentFolder = useCallback(async () => {
    if (!driveId) return
    
    try {
      const entries = await DriveApiService.listFolder(driveId, treeRoot, false)
      const children = await buildNodesForFolder(treeRoot, entries, driveId)
      onSetFileSystemRef.current(children)
      
      // Reload complete file system for search
      const allEntries = await DriveApiService.listFolder(driveId, '/', true)
      const completeTree = buildCompleteFileSystemTree(allEntries)
      onSetCompleteFileSystemRef.current(completeTree)
      
      // Update current view based on tree root
      if (treeRoot === '/') {
        const rootChildren = completeTree.filter(node => 
          node.id.startsWith('/') && !node.id.slice(1).includes('/')
        )
        onUpdateStateRef.current({ 
          currentView: rootChildren,
          selectedNode: { id: 'virtual-root', name: 'Root', type: 'folder', children: rootChildren }
        })
      } else {
        const updatedFolder = findNodeById(completeTree, treeRoot)
        if (updatedFolder && updatedFolder.children) {
          onUpdateStateRef.current({ 
            currentView: updatedFolder.children,
            selectedNode: updatedFolder
          })
        }
      }
    } catch (error) {
      // Failed to reload folder
    }
  }, [driveId, treeRoot])

  return {
    reloadCurrentFolder
  }
}
