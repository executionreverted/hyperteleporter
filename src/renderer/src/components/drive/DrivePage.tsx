import React, { useEffect, useCallback, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { cn } from '../../../lib/utils'
import { ContentPanel } from '../../../../components/ui/content-panel'
import { Dropzone } from '../../../../components/ui/dropzone'
import Prism from '../../../../components/ui/prism'
import { ContextMenu } from '../../../../components/ui/context-menu'
import { DownloadsModal } from '../common/DownloadsModal'
import { SettingsModal } from '../common/SettingsModal'
import { ClearContentProgressModal } from '../common/ClearContentProgressModal'
import { useDriveState } from './hooks/useDriveState'
import { useFileOperations } from './hooks/useFileOperations'
import { useNavigation } from './hooks/useNavigation'
import { useSyncStatus } from './hooks/useSyncStatus'
import { useDriveData } from './hooks/useDriveData'
import { useEventListeners } from './hooks/useEventListeners'
import { DriveHeader } from './DriveHeader'
import { DriveSidebar } from './DriveSidebar'
import { NewFolderModal } from './NewFolderModal'
import { TreeNode } from './types'
import { DriveApiService } from './services/driveApiService'
import { buildCompleteFileSystemTree, findNodeById, expandAllFolders } from './utils/fileSystemUtils'
import { useGlobalSearch } from '../../hooks/useGlobalSearch'
import { UploadProgressModal } from '../common/UploadProgressModal'

export const DrivePage: React.FC = () => {
  const params = useParams()
  const navigate = useNavigate()
  
  // Preview modal state
  const [previewRect, setPreviewRect] = useState<DOMRect | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [previewNode, setPreviewNode] = useState<TreeNode | null>(null)
  
  // Clear content progress state
  const [clearProgress, setClearProgress] = useState({
    isOpen: false,
    currentItem: '',
    deletedCount: 0,
    totalItems: 0,
    progress: 0
  })
  
  const {
    state,
    currentPathRef,
    updateState,
    setSelectedNode,
    setFileSystem,
    setCompleteFileSystem,
    setTreeRoot,
    setExpandedNodes,
    setCurrentDrive,
    setSyncStatus,
    setIsDriveSyncing,
    setIsInitialSync,
    setShowNewFolderModal,
    setTargetFolderForNewFolder,
    setShowDownloadsModal,
    setShowSettingsModal,
    setHoveredEllipsis,
    setHideTimeout,
  } = useDriveState()

  // Initialize custom hooks
  const { reloadCurrentFolder } = useDriveData({
    driveId: params.driveId as string,
    completeFileSystem: state.completeFileSystem,
    treeRoot: state.treeRoot,
    onSetFileSystem: setFileSystem,
    onSetCompleteFileSystem: setCompleteFileSystem,
    onSetCurrentDrive: setCurrentDrive,
    onSetExpandedNodes: setExpandedNodes,
    onUpdateState: updateState,
    onSetSelectedNode: setSelectedNode
  })

  useSyncStatus({
    currentDrive: state.currentDrive,
    onSetSyncStatus: setSyncStatus,
    onSetIsDriveSyncing: setIsDriveSyncing,
    onSetIsInitialSync: setIsInitialSync
  })

  useEventListeners({
    driveId: params.driveId as string,
    onReload: reloadCurrentFolder
  })

  // Global search functionality - trigger search button click
  useGlobalSearch({
    onSearchTriggered: () => {
      // Find and click the search button
      const searchButton = document.querySelector('[title="Search Files"]') as HTMLButtonElement
      if (searchButton) {
        searchButton.click()
      }
    }
  })

  const { 
    handleFileUpload, 
    handleDeleteNode, 
    handleDownloadFile, 
    handleDownloadFolder 
  } = useFileOperations({
    driveId: params.driveId as string,
    currentDrive: state.currentDrive,
    onReload: reloadCurrentFolder,
    onNodeDeleted: (nodeId) => {
      if (state.selectedNode?.id === nodeId) {
        setSelectedNode(undefined)
      }
    },
    onShowDownloads: () => setShowDownloadsModal(true)
  })


  // Keep stable ref for current folder path
  useEffect(() => {
    currentPathRef.current = state.treeRoot || '/'
  }, [state.treeRoot, currentPathRef])

  // Listen for clear content progress events
  useEffect(() => {
    const handleClearProgress = (event: CustomEvent) => {
      const { currentItem, deletedCount, totalItems, progress } = event.detail
      setClearProgress(prev => ({
        ...prev,
        currentItem,
        deletedCount,
        totalItems,
        progress
      }))
    }

    window.addEventListener('clear-content-progress', handleClearProgress as EventListener)
    return () => {
      window.removeEventListener('clear-content-progress', handleClearProgress as EventListener)
    }
  }, [])

  // Handler functions
  const handleFileUploadWithPath = useCallback((files: File[]) => {
    handleFileUpload(files, currentPathRef.current)
  }, [handleFileUpload])

  const handleNodeToggle = useCallback((node: TreeNode) => {
    setExpandedNodes(prev => {
      const newSet = new Set<string>(prev)
      if (newSet.has(node.id)) {
        newSet.delete(node.id)
      } else {
        newSet.add(node.id)
      }
      return newSet
    })
  }, [setExpandedNodes])

  const handleClearContent = useCallback(async () => {
    if (!params.driveId) return
    
    try {
      // Show progress modal
      setClearProgress({
        isOpen: true,
        currentItem: '',
        deletedCount: 0,
        totalItems: 0,
        progress: 0
      })
      
      // Navigate to root folder first
      setTreeRoot('/')
      updateState({
        currentView: [],
        breadcrumbPath: [],
        navigationStack: [],
        selectedNode: undefined
      })
      
      // Clear the drive content
      const result = await (window as any)?.api?.drives?.clearContent?.(params.driveId)
      if (result?.success) {
        // Reload the complete file system to reflect the changes
        const allEntries = await DriveApiService.listFolder(params.driveId, '/', true)
        const updatedCompleteTree = buildCompleteFileSystemTree(allEntries)
        setCompleteFileSystem(updatedCompleteTree)
        
        // Reset expanded nodes since everything is cleared
        setExpandedNodes(new Set())
        
        // Reload the current folder to reflect the changes
        reloadCurrentFolder()
        console.log(`Cleared ${result.deletedCount} items from drive`)
      } else {
        console.error('Failed to clear drive content:', result?.error)
        throw new Error(result?.error || 'Failed to clear drive content')
      }
    } catch (error) {
      console.error('Error clearing drive content:', error)
      throw error // Re-throw to show error in UI
    } finally {
      // Hide progress modal
      setClearProgress(prev => ({ ...prev, isOpen: false }))
    }
  }, [params.driveId, reloadCurrentFolder, setTreeRoot, updateState])

  const handleCreateFolderFromTree = useCallback((parentPath: string) => {
    const driveId = params.driveId as string
    if (!driveId) return
    
    // Set the current folder path for the new folder modal
    const currentFolderPath = parentPath === '/' ? '/' : parentPath
    
    // Set the target folder first, then open the modal
    setTargetFolderForNewFolder(currentFolderPath)
    setShowNewFolderModal(true)
  }, [params.driveId, setTargetFolderForNewFolder, setShowNewFolderModal])

  const handleCreateFolderWithAutoExpand = useCallback(async () => {
    // After folder creation, reload the complete file system first to get the updated tree
    const parentPath = state.targetFolderForNewFolder
    const parentNodeId = parentPath === '/' ? 'virtual-root' : parentPath
    
    const driveId = params.driveId as string
    if (driveId) {
      try {
        // Reload the complete file system to get the updated tree with the new folder
        const allEntries = await DriveApiService.listFolder(driveId, '/', true)
        const updatedCompleteTree = buildCompleteFileSystemTree(allEntries)
        setCompleteFileSystem(updatedCompleteTree)
        
        // Auto-expand all folders including the newly created ones
        const allExpanded = expandAllFolders(updatedCompleteTree)
        setExpandedNodes(allExpanded)
        
        // Reload the current folder to show the newly created folder
        await reloadCurrentFolder()
        
        // Find the updated parent node with the new folder
        const updatedParentNode = findNodeById(updatedCompleteTree, parentNodeId)
        if (updatedParentNode) {
          // Select the parent folder to show its contents with the new folder
          setSelectedNode(updatedParentNode)
        }
        
        // Close the modal after successful creation
        setShowNewFolderModal(false)
        setTargetFolderForNewFolder('/')
      } catch (error) {
        console.error('Failed to reload complete file system:', error)
        // Fallback: just select the parent node
        const parentNode = findNodeById(state.completeFileSystem, parentNodeId)
        if (parentNode) {
          setSelectedNode(parentNode)
        }
        // Close the modal even on error
        setShowNewFolderModal(false)
        setTargetFolderForNewFolder('/')
      }
    }
  }, [state.targetFolderForNewFolder, state.completeFileSystem, params.driveId, setCompleteFileSystem, setExpandedNodes, reloadCurrentFolder, setSelectedNode, setShowNewFolderModal, setTargetFolderForNewFolder])

  const handleNavigateUp = useCallback(() => {
    // TODO: Implement navigate up functionality
  }, [])


  const handlePreviewAnchor = useCallback((rect: DOMRect, node: TreeNode) => {
    // Create a fake rect for the preview modal
    const fakeRect = {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      right: rect.right,
      bottom: rect.bottom,
      x: rect.x,
      y: rect.y,
      toJSON: () => rect,
    } as DOMRect

    // Directly manage preview state instead of dispatching event
    setPreviewRect(fakeRect)
    setPreviewNode(node)
    setIsPreviewOpen(true)
  }, [])

  const closePreview = useCallback(() => {
    setIsPreviewOpen(false)
  }, [])

  const {
    handleNodeSelect,
    handleFileClick,
    handleBreadcrumbClick,
    handleNavigateToFolder,
    handleBack,
    handleSearchSelect
  } = useNavigation({
    completeFileSystem: state.completeFileSystem,
    currentView: state.currentView,
    navigationStack: state.navigationStack,
    treeRoot: state.treeRoot,
    selectedNode: state.selectedNode,
    lastFocusedFolder: state.lastFocusedFolder,
    onUpdateState: updateState,
    onSetTreeRoot: setTreeRoot,
    onSetSelectedNode: setSelectedNode,
    onPreviewAnchor: handlePreviewAnchor,
    driveId: params.driveId as string
  })

  const handleContentPanelNavigateUp = useCallback(() => {
    const parentPath = state.treeRoot.split('/').slice(0, -1).join('/') || '/'
    handleBreadcrumbClick(parentPath)
  }, [state.treeRoot, handleBreadcrumbClick])

  const handleContextMenu = useCallback((node: TreeNode, actions: any[], event: React.MouseEvent) => {
    // The TreeView component handles the context menu internally
    // This is just a placeholder to satisfy the prop requirement
    // The actual context menu logic is in the TreeView component
  }, [])

  const handleEllipsisMouseEnter = useCallback(() => {
    if (state.hideTimeout) {
      clearTimeout(state.hideTimeout)
      setHideTimeout(null)
    }
    setHoveredEllipsis(true)
  }, [state.hideTimeout, setHideTimeout, setHoveredEllipsis])

  const handleEllipsisMouseLeave = useCallback(() => {
    const timeout = setTimeout(() => {
      setHoveredEllipsis(false)
    }, 150) // 150ms delay
    setHideTimeout(timeout)
  }, [setHoveredEllipsis, setHideTimeout])

  const handleOpenSettings = useCallback(() => {
    setShowSettingsModal(true)
  }, [setShowSettingsModal])

  const handleOpenProfileSettings = useCallback(() => {
    // TODO: Implement profile settings
  }, [])

  const handleNavigateToDrives = useCallback(() => {
    navigate('/drives')
  }, [navigate])

  const handleExpandAll = useCallback(() => {
    const allExpanded = expandAllFolders(state.completeFileSystem)
    setExpandedNodes(allExpanded)
  }, [state.completeFileSystem, setExpandedNodes])

  const handleCollapseAll = useCallback(() => {
    setExpandedNodes(new Set())
  }, [setExpandedNodes])

  const canWrite = state.currentDrive?.isWritable ?? true

  return (
    <div className="min-h-screen bg-black relative">
      <div
        className={cn(
          "flex w-full flex-1 flex-col overflow-hidden md:flex-row",
          "h-screen relative z-20"
        )}
      >
        <DriveSidebar
          treeRoot={state.treeRoot}
          completeFileSystem={state.completeFileSystem}
          expandedNodes={state.expandedNodes}
          selectedNode={state.selectedNode}
          hoveredEllipsis={state.hoveredEllipsis}
          hideTimeout={state.hideTimeout}
          currentDrive={state.currentDrive}
          isDriveSyncing={state.isDriveSyncing}
          canWrite={canWrite}
          onNavigateToDrives={handleNavigateToDrives}
          onOpenSettings={handleOpenSettings}
          onOpenProfileSettings={handleOpenProfileSettings}
          onNodeToggle={handleNodeToggle}
          onNodeSelect={handleNodeSelect}
          onContextMenu={handleContextMenu}
          onNavigateUp={handleNavigateUp}
          onNavigateToFolder={handleNavigateToFolder}
          onPreviewAnchor={handlePreviewAnchor}
          onCreateFolder={handleCreateFolderFromTree}
          onRefresh={reloadCurrentFolder}
          onDelete={handleDeleteNode}
          onDownloadFolder={handleDownloadFolder}
          onDownloadFile={handleDownloadFile}
          onBreadcrumbClick={handleBreadcrumbClick}
          onExpandAll={handleExpandAll}
          onCollapseAll={handleCollapseAll}
          onEllipsisMouseEnter={handleEllipsisMouseEnter}
          onEllipsisMouseLeave={handleEllipsisMouseLeave}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Header - takes only space it needs */}
          <DriveHeader
            currentDrive={state.currentDrive}
            syncStatus={state.syncStatus}
            isDriveSyncing={state.isDriveSyncing}
            isInitialSync={state.isInitialSync}
            completeFileSystem={state.completeFileSystem}
            onSearchSelect={handleSearchSelect}
            onRefresh={reloadCurrentFolder}
            onShowDownloads={() => setShowDownloadsModal(true)}
            onShowNewFolder={() => {
              if (!canWrite) return
              setShowNewFolderModal(true)
              setTargetFolderForNewFolder(state.treeRoot)
            }}
            canWrite={canWrite}
          />

          {/* Content Panel - takes remaining space */}
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-neutral-800 hover:scrollbar-thumb-neutral-500">
            <ContentPanel 
              selectedNode={state.selectedNode} 
              onFileClick={handleFileClick}
              onNavigateUp={handleContentPanelNavigateUp}
              canNavigateUp={state.treeRoot !== '/'}
              driveId={params.driveId as string}
              onFileDeleted={reloadCurrentFolder}
              onCreateFolder={handleCreateFolderFromTree}
              onRefresh={reloadCurrentFolder}
              onDownloadFile={handleDownloadFile}
              onDownloadFolder={handleDownloadFolder}
              onPreviewAnchor={handlePreviewAnchor}
              previewRect={previewRect}
              isPreviewOpen={isPreviewOpen}
              previewNode={previewNode}
              onClosePreview={closePreview}
              canWrite={canWrite}
              currentDrive={state.currentDrive ? { name: state.currentDrive.name, id: state.currentDrive.id } : undefined}
              syncStatus={state.syncStatus}
              isDriveSyncing={state.isDriveSyncing}
            />
            
            {/* Bottom Connecting Indicator */}
            {state.isInitialSync && (
              <div className="flex items-center justify-center gap-2 px-4 py-3 bg-amber-500/10 border-t border-amber-500/20">
                <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-amber-400 text-sm font-medium">Connecting to drive...</span>
                <span className="text-neutral-500 text-xs">Browsing previously synced data</span>
              </div>
            )}
          </div>
          
          {/* Dropzone - always at bottom, takes only space it needs */}
          {canWrite && (
            <div className="flex-shrink-0">
              <Dropzone onFileUpload={handleFileUploadWithPath} />
            </div>
          )}
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
        isOpen={false}
        position={{ x: 0, y: 0 }}
        actions={[]}
        onClose={() => {}}
      />
      
      {/* Downloads Modal */}
      <div style={{ display: state.showDownloadsModal ? 'block' : 'none' }}>
        <DownloadsModal
          isOpen={true}
          onClose={() => setShowDownloadsModal(false)}
        />
      </div>
      
      {/* Settings Modal */}
      <div style={{ display: state.showSettingsModal ? 'block' : 'none' }}>
        <SettingsModal
          isOpen={true}
          onClose={() => setShowSettingsModal(false)}
          onClearContent={handleClearContent}
        />
      </div>
      
      {/* Clear Content Progress Modal */}
      <ClearContentProgressModal
        isOpen={clearProgress.isOpen}
        currentItem={clearProgress.currentItem}
        deletedCount={clearProgress.deletedCount}
        totalItems={clearProgress.totalItems}
        progress={clearProgress.progress}
      />
      
      {/* New Folder Modal */}
      <NewFolderModal
        driveId={params.driveId as string}
        currentFolder={state.targetFolderForNewFolder}
        isOpen={state.showNewFolderModal}
        onClose={() => {
          setShowNewFolderModal(false)
          setTargetFolderForNewFolder('/')
        }}
        onCreated={handleCreateFolderWithAutoExpand}
      />
      
      {/* Peers Indicator - Bottom Right */}
      {state.syncStatus && !state.isInitialSync && (
        <div className="fixed bottom-1 right-4 z-30 border-dashed bg-black/70 backdrop-blur-sm border border-white/10 rounded-lg px-3 flex items-center gap-2 text-sm" style={{ height: '58px' }}>
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-white font-medium">{state.syncStatus.peers}</span>
          <span className="text-neutral-400">peer{state.syncStatus.peers !== 1 ? 's' : ''}</span>
          {state.isDriveSyncing && (
            <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse ml-1"></div>
          )}
        </div>
      )}

      {/* Upload Progress Modal */}
      <UploadProgressModal />
    </div>
  )
}
