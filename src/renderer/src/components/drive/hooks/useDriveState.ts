import { useState, useRef, useCallback } from 'react'
import { DrivePageState, TreeNode, SyncStatus, DriveInfo } from '../types'

const initialState: DrivePageState = {
  selectedNode: undefined,
  fileSystem: [],
  completeFileSystem: [],
  lastFocusedFolder: undefined,
  expandedNodes: new Set(),
  treeRoot: '/',
  currentView: [],
  breadcrumbPath: [],
  navigationStack: [],
  navigationDirection: 'forward',
  showNewFolderModal: false,
  targetFolderForNewFolder: '/',
  showDownloadsModal: false,
  showSettingsModal: false,
  isDriveSyncing: false,
  syncStatus: null,
  isInitialSync: false,
  currentDrive: null,
  hoveredEllipsis: false,
  hideTimeout: null,
}

export function useDriveState() {
  const [state, setState] = useState<DrivePageState>(initialState)
  const currentPathRef = useRef<string>('/')

  const updateState = useCallback((updates: Partial<DrivePageState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }, [])

  const setSelectedNode = useCallback((node: TreeNode | undefined) => {
    setState(prev => ({ ...prev, selectedNode: node }))
  }, [])

  const setFileSystem = useCallback((fileSystem: TreeNode[]) => {
    setState(prev => ({ ...prev, fileSystem }))
  }, [])

  const setCompleteFileSystem = useCallback((completeFileSystem: TreeNode[]) => {
    setState(prev => ({ ...prev, completeFileSystem }))
  }, [])

  const setTreeRoot = useCallback((treeRoot: string) => {
    setState(prev => ({ ...prev, treeRoot }))
    currentPathRef.current = treeRoot
  }, [])

  const setExpandedNodes = useCallback((expandedNodes: Set<string> | ((prev: Set<string>) => Set<string>)) => {
    setState(prev => ({ 
      ...prev, 
      expandedNodes: typeof expandedNodes === 'function' ? expandedNodes(prev.expandedNodes) : expandedNodes 
    }))
  }, [])

  const setCurrentDrive = useCallback((currentDrive: DriveInfo | null) => {
    setState(prev => ({ ...prev, currentDrive }))
  }, [])

  const setSyncStatus = useCallback((syncStatus: SyncStatus | null) => {
    setState(prev => ({ ...prev, syncStatus }))
  }, [])

  const setIsDriveSyncing = useCallback((isDriveSyncing: boolean) => {
    setState(prev => ({ ...prev, isDriveSyncing }))
  }, [])

  const setIsInitialSync = useCallback((isInitialSync: boolean) => {
    setState(prev => ({ ...prev, isInitialSync }))
  }, [])

  const setShowNewFolderModal = useCallback((showNewFolderModal: boolean) => {
    setState(prev => ({ ...prev, showNewFolderModal }))
  }, [])

  const setTargetFolderForNewFolder = useCallback((targetFolderForNewFolder: string) => {
    setState(prev => ({ ...prev, targetFolderForNewFolder }))
  }, [])

  const setShowDownloadsModal = useCallback((showDownloadsModal: boolean) => {
    setState(prev => ({ ...prev, showDownloadsModal }))
  }, [])

  const setShowSettingsModal = useCallback((showSettingsModal: boolean) => {
    setState(prev => ({ ...prev, showSettingsModal }))
  }, [])

  const setHoveredEllipsis = useCallback((hoveredEllipsis: boolean) => {
    setState(prev => ({ ...prev, hoveredEllipsis }))
  }, [])

  const setHideTimeout = useCallback((hideTimeout: NodeJS.Timeout | null) => {
    setState(prev => ({ ...prev, hideTimeout }))
  }, [])

  const resetState = useCallback(() => {
    setState(initialState)
    currentPathRef.current = '/'
  }, [])

  return {
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
    resetState,
  }
}
