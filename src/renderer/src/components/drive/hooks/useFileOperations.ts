import { useCallback } from 'react'
import { useToaster } from '../../../contexts/ToasterContext'
import { DriveApiService } from '../services/driveApiService'
import { TreeNode, DriveInfo } from '../types'

interface UseFileOperationsProps {
  driveId: string | undefined
  currentDrive: DriveInfo | null
  onReload: () => Promise<void>
  onNodeDeleted?: (nodeId: string) => void
}

export function useFileOperations({
  driveId,
  currentDrive,
  onReload,
  onNodeDeleted
}: UseFileOperationsProps) {
  const toaster = useToaster()

  const handleFileUpload = useCallback(async (files: File[], currentFolderPath: string) => {
    if (!driveId || !files?.length) return
    
    try {
      const payload = await Promise.all(files.map(async (f) => ({ 
        name: f.name, 
        data: await f.arrayBuffer() 
      })))
      
      const res = await DriveApiService.uploadFiles(driveId, currentFolderPath, payload)
      await onReload()
      toaster.showSuccess('Upload Complete', `Successfully uploaded ${res.uploaded} file(s)`)
    } catch (error) {
      toaster.showError('Upload Failed', 'Failed to upload files. Please try again.')
    }
  }, [driveId, onReload, toaster])

  const handleDeleteNode = useCallback(async (node: TreeNode) => {
    if (!driveId) return
    
    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete "${node.name}"?${node.type === 'folder' ? ' This will delete all contents inside the folder.' : ''}`
    )
    
    if (!confirmed) return
    
    try {
      const success = await DriveApiService.deleteFile(driveId, node.id)
      if (success) {
        await onReload()
        onNodeDeleted?.(node.id)
        toaster.showSuccess('Delete Complete', `Successfully deleted ${node.name}`)
      } else {
        toaster.showError('Delete Failed', 'Failed to delete the item. Please try again.')
      }
    } catch (error) {
      toaster.showError('Delete Failed', 'An error occurred while deleting the item. Please try again.')
    }
  }, [driveId, onReload, onNodeDeleted, toaster])

  const handleDownloadFile = useCallback(async (node: TreeNode) => {
    if (!driveId || node.type !== 'file' || !currentDrive) return
    
    try {
      toaster.showInfo('Download Started', `Downloading ${node.name}...`)
      
      const result = await DriveApiService.downloadFile(driveId, node.id, node.name, currentDrive.name)
      
      if (result?.success) {
        toaster.showSuccess('Download Complete', `${node.name} saved to Downloads/HyperTeleporter/${currentDrive.name}/`, {
          label: 'Open Folder',
          onClick: () => DriveApiService.openDownloadsFolder(result.downloadPath!)
        })
        // Dispatch event to refresh downloads modal
        window.dispatchEvent(new CustomEvent('download-completed'))
      } else {
        toaster.showError('Download Failed', `Failed to download file: ${result?.error || 'Unknown error'}`)
      }
    } catch (error) {
      toaster.showError('Download Failed', 'Failed to download file. Please try again.')
    }
  }, [driveId, currentDrive, toaster])

  const handleDownloadFolder = useCallback(async (node: TreeNode) => {
    if (!driveId || node.type !== 'folder' || !currentDrive) return
    
    try {
      toaster.showInfo('Download Started', `Downloading folder ${node.name}...`)
      
      const result = await DriveApiService.downloadFolder(driveId, node.id, node.name, currentDrive.name)
      
      if (result?.success) {
        toaster.showSuccess('Download Complete', `${result.fileCount} files saved to Downloads/HyperTeleporter/${currentDrive.name}/`, {
          label: 'Open Folder',
          onClick: () => DriveApiService.openDownloadsFolder(result.downloadPath!)
        })
        // Dispatch event to refresh downloads modal
        window.dispatchEvent(new CustomEvent('download-completed'))
      } else {
        toaster.showError('Download Failed', `Failed to download folder: ${result?.error || 'Unknown error'}`)
      }
    } catch (error) {
      toaster.showError('Download Failed', 'Failed to download folder. Please try again.')
    }
  }, [driveId, currentDrive, toaster])

  return {
    handleFileUpload,
    handleDeleteNode,
    handleDownloadFile,
    handleDownloadFolder,
  }
}
