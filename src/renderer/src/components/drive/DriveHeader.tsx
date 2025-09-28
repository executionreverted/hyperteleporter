import React from 'react'
import { IconShare, IconDownload, IconSearch, IconRefresh, IconFolderPlus } from '@tabler/icons-react'
import { DriveInfo, SyncStatus } from './types'
import { FileSearchModal } from '../common/FileSearchModal'
import { ShareModal } from '../common/ShareModal'
import { TreeNode } from './types'

interface DriveHeaderProps {
  currentDrive: DriveInfo | null
  syncStatus: SyncStatus | null
  isDriveSyncing: boolean
  isInitialSync: boolean
  completeFileSystem: TreeNode[]
  onSearchSelect: (node: TreeNode, pathNames: string[]) => void
  onRefresh: () => void
  onShowDownloads: () => void
  onShowNewFolder: () => void
  canWrite: boolean
}

export const DriveHeader: React.FC<DriveHeaderProps> = ({
  currentDrive,
  syncStatus,
  isDriveSyncing,
  isInitialSync,
  completeFileSystem,
  onSearchSelect,
  onRefresh,
  onShowDownloads,
  onShowNewFolder,
  canWrite,
}) => {
  return (
    <div className="border-b border-neutral-700 p-4">
      <div className="flex items-center justify-between">
        {/* Drive Info */}
        <div className="flex items-center gap-3">
          {currentDrive && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-2 bg-black/20 rounded-lg border border-white/10">
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">{currentDrive.name}</span>
                </div>
                {currentDrive.type === 'readonly' && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-xs font-medium border border-amber-500/30">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    <span>Read Only</span>
                  </div>
                )}
                {currentDrive.type === 'owned' && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium border border-green-500/30">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                    <span>Owned</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-4">
          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            {/* Search Button */}
            <FileSearchModal
              fileSystem={completeFileSystem}
              onSelect={onSearchSelect}
              triggerButton={
                <button
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-400 hover:bg-black/20 hover:text-white transition-colors rounded-lg"
                  title="Search Files"
                >
                  <IconSearch size={16} />
                  <span>Search</span>
                </button>
              }
            />
            
            <button
              onClick={onRefresh}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-400 hover:bg-black/20 hover:text-white transition-colors rounded-lg"
              title="Refresh"
            >
              <IconRefresh size={16} />
              <span>Refresh</span>
            </button>
            
            {/* Regular Sync Status Indicator */}
            {isDriveSyncing && !isInitialSync && (
              <div className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-400 bg-blue-500/10 rounded-lg">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <span>
                  {syncStatus?.isFindingPeers ? 'Finding peers...' : 'Syncing...'}
                </span>
                {syncStatus && (
                  <span className="text-xs text-blue-300">
                    v{syncStatus.version} • {syncStatus.peers} peers
                  </span>
                )}
              </div>
            )}
            
            {/* Downloads Button */}
            <button
              onClick={onShowDownloads}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-400 hover:bg-black/20 hover:text-white transition-colors rounded-lg"
              title="View Downloads"
            >
              <IconDownload size={16} />
              <span>Downloads</span>
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
            
            {/* New Folder Button */}
            {canWrite && (
              <button
                onClick={onShowNewFolder}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-400 hover:bg-black/20 hover:text-white transition-colors rounded-lg"
                title="Create New Folder"
              >
                <IconFolderPlus size={16} />
                <span>New Folder</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
