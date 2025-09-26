import { useEffect, useCallback, useRef } from 'react'
import { DriveApiService } from '../services/driveApiService'
import { DriveInfo, SyncStatus } from '../types'

interface UseSyncStatusProps {
  currentDrive: DriveInfo | null
  onSetSyncStatus: (status: SyncStatus | null) => void
  onSetIsDriveSyncing: (isSyncing: boolean) => void
  onSetIsInitialSync: (isInitial: boolean) => void
}

export function useSyncStatus({
  currentDrive,
  onSetSyncStatus,
  onSetIsDriveSyncing,
  onSetIsInitialSync
}: UseSyncStatusProps) {
  // Store callbacks in refs to avoid dependency issues
  const onSetSyncStatusRef = useRef(onSetSyncStatus)
  const onSetIsDriveSyncingRef = useRef(onSetIsDriveSyncing)
  const onSetIsInitialSyncRef = useRef(onSetIsInitialSync)
  
  // Update refs when callbacks change
  onSetSyncStatusRef.current = onSetSyncStatus
  onSetIsDriveSyncingRef.current = onSetIsDriveSyncing
  onSetIsInitialSyncRef.current = onSetIsInitialSync

  const checkSyncStatus = useCallback(async () => {
    if (!currentDrive?.id) return
    
    try {
      const status = await DriveApiService.checkSyncStatus(currentDrive.id)
      onSetIsDriveSyncingRef.current(status.isSyncing)
      onSetSyncStatusRef.current({ 
        version: status.version, 
        peers: status.peers, 
        isFindingPeers: status.isFindingPeers 
      })
      
      // Only show initial sync for joined drives with no peers
      const isOwned = currentDrive?.type === 'owned'
      if (!isOwned && status.peers === 0) {
        onSetIsInitialSyncRef.current(true)
      } else {
        onSetIsInitialSyncRef.current(false)
      }
    } catch (error) {
      // Failed to check sync status
    }
  }, [currentDrive?.id, currentDrive?.type])

  // Set up periodic sync status checking
  useEffect(() => {
    if (!currentDrive?.id) return

    // Check immediately
    checkSyncStatus()

    // Set up interval to check every 2 seconds
    const interval = setInterval(checkSyncStatus, 2000)

    return () => clearInterval(interval)
  }, [currentDrive?.id, checkSyncStatus])

  return {
    checkSyncStatus
  }
}
