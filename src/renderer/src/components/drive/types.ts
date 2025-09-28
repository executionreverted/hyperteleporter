export interface TreeNode {
  id: string
  name: string
  type: 'file' | 'folder'
  children?: TreeNode[]
}

export interface DriveInfo {
  id: string
  name: string
  driveKey: string
  type?: 'owned' | 'readonly'
  isWritable?: boolean
}

export interface SyncStatus {
  version: number
  peers: number
  isFindingPeers: boolean
}

export interface FileEntry {
  key: string
  value: Record<string, unknown>
}

export interface BreadcrumbItem {
  name: string
  path: string
  isEllipsis?: boolean
  isHome?: boolean
  hiddenParents?: Array<{ name: string; path: string }>
}

export interface DrivePageState {
  selectedNode: TreeNode | undefined
  fileSystem: TreeNode[]
  completeFileSystem: TreeNode[]
  lastFocusedFolder: TreeNode | undefined
  expandedNodes: Set<string>
  treeRoot: string
  currentView: TreeNode[]
  breadcrumbPath: string[]
  navigationStack: TreeNode[][]
  navigationDirection: 'forward' | 'backward'
  showNewFolderModal: boolean
  targetFolderForNewFolder: string
  showDownloadsModal: boolean
  showSettingsModal: boolean
  isDriveSyncing: boolean
  syncStatus: SyncStatus | null
  isInitialSync: boolean
  currentDrive: DriveInfo | null
  hoveredEllipsis: boolean
  hideTimeout: NodeJS.Timeout | null
}
