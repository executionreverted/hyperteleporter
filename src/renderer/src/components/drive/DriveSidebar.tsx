import React from 'react'
import { useNavigate } from 'react-router-dom'
import { IconSettings, IconUser } from '@tabler/icons-react'
import { Sidebar, SidebarBody } from '../../../../components/ui/sidebar'
import { TreeView } from '../../../../components/ui/tree-view'
import { DelayedTooltip } from '../../../../components/ui/delayed-tooltip'
import { HardDriveIcon } from '../../../../components/ui/hard-drive-icon'
import { TeleportLogo } from '../common/TeleportLogo'
import { TreeNode, DriveInfo, SyncStatus, BreadcrumbItem } from './types'
import { getBreadcrumbPath } from './utils/breadcrumbUtils'
import { processTreeNodes } from './utils/fileSystemUtils'
import ExpandAllIcon from '../../assets/expand-all.svg'
import CollapseAllIcon from '../../assets/collapse-all.svg'

interface DriveSidebarProps {
  treeRoot: string
  completeFileSystem: TreeNode[]
  expandedNodes: Set<string>
  selectedNode: TreeNode | undefined
  hoveredEllipsis: boolean
  hideTimeout: NodeJS.Timeout | null
  currentDrive: DriveInfo | null
  isDriveSyncing: boolean
  canWrite: boolean
  onNavigateToDrives: () => void
  onOpenSettings: () => void
  onOpenProfileSettings: () => void
  onNodeToggle: (node: TreeNode) => void
  onNodeSelect: (node: TreeNode) => void
  onContextMenu: (node: TreeNode, actions: any[], event: React.MouseEvent) => void
  onNavigateUp: () => void
  onNavigateToFolder: (node: TreeNode) => void
  onPreviewAnchor?: (rect: DOMRect, node: TreeNode) => void
  onCreateFolder: (parentPath: string) => void
  onRefresh: () => void
  onDelete: (node: TreeNode) => void
  onDownloadFolder: (node: TreeNode) => void
  onDownloadFile: (node: TreeNode) => void
  onBreadcrumbClick: (path: string) => void
  onExpandAll: () => void
  onCollapseAll: () => void
  onEllipsisMouseEnter: () => void
  onEllipsisMouseLeave: () => void
}

export const DriveSidebar: React.FC<DriveSidebarProps> = ({
  treeRoot,
  completeFileSystem,
  expandedNodes,
  selectedNode,
  hoveredEllipsis,
  hideTimeout,
  currentDrive,
  isDriveSyncing,
  canWrite,
  onNavigateToDrives,
  onOpenSettings,
  onOpenProfileSettings,
  onNodeToggle,
  onNodeSelect,
  onContextMenu,
  onNavigateUp,
  onNavigateToFolder,
  onPreviewAnchor,
  onCreateFolder,
  onRefresh,
  onDelete,
  onDownloadFolder,
  onDownloadFile,
  onBreadcrumbClick,
  onExpandAll,
  onCollapseAll,
  onEllipsisMouseEnter,
  onEllipsisMouseLeave,
}) => {
  const navigate = useNavigate()

  // Get current tree data based on tree root
  const getCurrentTreeData = (): TreeNode[] => {
    if (treeRoot === '/') {
      return processTreeNodes(completeFileSystem)
    }
    
    // Find the node at the tree root
    const rootNode = findNodeById(completeFileSystem, treeRoot)
    if (!rootNode || !rootNode.children) {
      return []
    }
    
    return processTreeNodes(rootNode.children)
  }

  // Check if current folder is actually empty
  const isCurrentFolderEmpty = (): boolean => {
    if (treeRoot === '/') {
      return completeFileSystem.length === 0
    }
    
    const rootNode = findNodeById(completeFileSystem, treeRoot)
    return !rootNode || !rootNode.children || rootNode.children.length === 0
  }

  // Get breadcrumb path
  const breadcrumbPath = getBreadcrumbPath(treeRoot)

  return (
    <Sidebar open={true} setOpen={() => {}}>
      <SidebarBody className="justify-between gap-4 h-full relative">
        <div className="flex flex-1 flex-col overflow-x-hidden">
          {/* Brand / Logo */}
          <div className="flex items-center justify-center w-full mb-4 flex-shrink-0">
            <TeleportLogo containerSize='80%' fill autoplay loop pingPong className="select-none w-1/2" />
          </div>

          {/* Navigation Links */}
          <div className="flex-1 min-h-0">
            <div className="h-full flex flex-col">
              <div className="mb-2 flex-shrink-0 flex items-center justify-center gap-2">
                <DelayedTooltip description="Navigate to drives overview">
                  <button
                    onClick={onNavigateToDrives}
                    className="p-2 rounded-full bg-black/40 border border-white/15 hover:bg-black/60 text-white transition-colors shadow-lg"
                  >
                    <HardDriveIcon size={18} />
                  </button>
                </DelayedTooltip>
                <DelayedTooltip description="Configure drive preferences and options">
                  <button
                    onClick={onOpenSettings}
                    className="p-2 rounded-full bg-black/40 border border-white/15 hover:bg-black/60 text-white transition-colors shadow-lg"
                  >
                    <IconSettings size={18} />
                  </button>
                </DelayedTooltip>
                <DelayedTooltip description="Manage your user profile and account">
                  <button
                    onClick={onOpenProfileSettings}
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
                    {breadcrumbPath.map((item, index) => (
                      <div key={item.path || `ellipsis-${index}`} className="flex items-center">
                        {index > 0 && (
                          <svg className="w-2.5 h-2.5 mx-0.5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                        {item.isEllipsis ? (
                          <div 
                            className="relative"
                            onMouseEnter={onEllipsisMouseEnter}
                            onMouseLeave={onEllipsisMouseLeave}
                          >
                            <span className="px-2 py-0.5 text-neutral-500 cursor-help">
                              {item.name}
                            </span>
                            {item.hiddenParents && item.hiddenParents.length > 0 && hoveredEllipsis && (
                              <div 
                                className="absolute top-full left-0 mt-2 z-50"
                                onMouseEnter={onEllipsisMouseEnter}
                                onMouseLeave={onEllipsisMouseLeave}
                              >
                                <div className="bg-black/70 shadow-lg p-2 min-w-40 max-w-48">
                                  <div className="text-xs text-neutral-300 mb-2 font-medium">Navigate to:</div>
                                  <div className="space-y-1">
                                    {item.hiddenParents.map((parent, idx) => (
                                      <button
                                        key={parent.path}
                                        onClick={() => {
                                          onBreadcrumbClick(parent.path)
                                          onEllipsisMouseLeave()
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
                            onClick={() => onBreadcrumbClick(item.path)}
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
                        onClick={onExpandAll}
                        className="p-1.5 rounded hover:bg-black/20 text-neutral-400 hover:text-white transition-colors"
                      >
                        <img src={ExpandAllIcon} alt="Expand all" className="w-4 h-4" />
                      </button>
                    </DelayedTooltip>
                    <DelayedTooltip description="Collapse all folders in the current view">
                      <button
                        onClick={onCollapseAll}
                        className="p-1.5 rounded hover:bg-black/20 text-neutral-400 hover:text-white transition-colors"
                      >
                        <img src={CollapseAllIcon} alt="Collapse all" className="w-4 h-4" />
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
                            const parentPath = treeRoot.split('/').slice(0, -1).join('/') || '/'
                            onBreadcrumbClick(parentPath)
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
                        onNodeToggle={onNodeToggle}
                        selectedNodeId={selectedNode?.id}
                        expandedNodes={expandedNodes}
                        onContextMenu={onContextMenu}
                        onNavigateUp={onNavigateUp}
                        onNavigateToFolder={onNavigateToFolder}
                        onPreviewAnchor={onPreviewAnchor}
                        showBreadcrumb={false}
                        breadcrumbPath={[]}
                        navigationDirection="forward"
                        onCreateFolder={onCreateFolder}
                        onRefresh={onRefresh}
                        onDelete={onDelete}
                        onDownloadFolder={onDownloadFolder}
                        onDownloadFile={onDownloadFile}
                        canWrite={canWrite}
                        isSyncing={isDriveSyncing}
                        driveId={currentDrive?.id}
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
  )
}

// Helper function to find node by ID
function findNodeById(nodes: TreeNode[], targetId: string): TreeNode | null {
  for (const node of nodes) {
    if (node.id === targetId) return node
    if (node.children) {
      const found = findNodeById(node.children, targetId)
      if (found) return found
    }
  }
  return null
}
