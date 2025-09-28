import { useCallback, useEffect } from 'react'
import { useToaster } from '../../../contexts/ToasterContext'
import { useUploadProgress } from '../../../contexts/UploadProgressContext'
import { useDownloadProgress } from '../../../contexts/DownloadProgressContext'
import { DriveApiService } from '../services/driveApiService'
import { TreeNode, DriveInfo } from '../types'

interface UseFileOperationsProps {
  driveId: string | undefined
  currentDrive: DriveInfo | null
  onReload: () => Promise<void>
  onNodeDeleted?: (nodeId: string) => void
  onShowDownloads?: () => void
}

export function useFileOperations({
  driveId,
  currentDrive,
  onReload,
  onNodeDeleted,
  onShowDownloads
}: UseFileOperationsProps) {
  const toaster = useToaster()
  const { startUpload, updateProgress, completeUpload } = useUploadProgress()
  const { startDownload, updateProgress: updateDownloadProgress, updateDownloadPath, completeDownload, failDownload } = useDownloadProgress()

  // Listen for download progress events
  useEffect(() => {
    const handleDownloadProgress = (event: CustomEvent) => {
      const { downloadId, currentFile, downloadedFiles, totalFiles, folderName } = event.detail
      console.log('[Download Progress]', { downloadId, currentFile, downloadedFiles, totalFiles, folderName })
      if (downloadId) {
        updateDownloadProgress(downloadId, currentFile, downloadedFiles, totalFiles)
      }
    }

    window.addEventListener('download-progress', handleDownloadProgress as EventListener)
    return () => {
      window.removeEventListener('download-progress', handleDownloadProgress as EventListener)
    }
  }, [updateDownloadProgress])

  const handleFileUpload = useCallback(async (files: File[], currentFolderPath: string) => {
    if (!driveId || !files?.length) return
    
    // Check if this is a folder upload (has webkitRelativePath with folder structure)
    const isFolderUpload = files.some(file => {
      const webkitPath = file.webkitRelativePath
      return webkitPath && webkitPath.includes('/') && webkitPath.split('/').length > 1
    })
    
    if (isFolderUpload) {
      // Process folder upload
      const { processFolderUpload, checkNameConflicts, prepareFilesForUpload } = await import('../../../utils/folderUpload');
      
      const result = processFolderUpload(files as any)
      const folderName = result.folderName
      
      // Check for name conflicts (simplified - you might want to get existing items from state)
      const conflictCheck = checkNameConflicts(folderName, [])
      
      if (conflictCheck.hasConflicts) {
        toaster.showError('Upload Failed', `Folder "${folderName}" already exists. Please rename or delete the existing folder first.`)
        return
      }
      
      // Start upload progress
      startUpload(files.length, folderName)
      toaster.showInfo('Upload Started', `Uploading folder "${folderName}" with ${files.length} files...`)
      
      // No conflicts, proceed with upload
      try {
        // Check if files already have webkitRelativePath (from File System Access API)
        const hasWebkitPaths = files.some(file => file.webkitRelativePath && file.webkitRelativePath.includes('/'));

        let uploadFiles;
        if (hasWebkitPaths) {
          // Files already have proper webkitRelativePath, use them directly
          uploadFiles = await Promise.all(files.map(async (file, index) => {
            updateProgress(file.name, index);
            const data = await file.arrayBuffer();
            // Extract the relative path within the folder (remove folder name from webkitRelativePath)
            const webkitPath = file.webkitRelativePath || file.name;
            const relativePath = webkitPath.startsWith(`${folderName}/`)
              ? webkitPath.substring(folderName.length + 1)
              : webkitPath;

            return {
              name: file.name,
              data,
              relativePath: relativePath
            };
          }));
        } else {
          // Process files through folder upload utility
          uploadFiles = await prepareFilesForUpload(result.files, folderName)
        }

        // Create the folder path by combining current directory with folder name
        const targetFolderPath = currentFolderPath === '/' ? `/${folderName}` : `${currentFolderPath}/${folderName}`
        
        const res = await DriveApiService.uploadFolder(driveId, targetFolderPath, uploadFiles)
        completeUpload()
        await onReload()
        toaster.showSuccess('Upload Complete', `Successfully uploaded folder "${folderName}" with ${res.uploaded} file(s)`)
      } catch (e) {
        completeUpload()
        toaster.showError('Upload Failed', 'Failed to upload folder. Please try again.')
      }
    } else {
      // Handle regular file uploads (single or multiple files without folder structure)
      startUpload(files.length, '')
      toaster.showInfo('Upload Started', `Uploading ${files.length} file(s)...`)
      
      try {
        const payload = await Promise.all(files.map(async (f, index) => {
          updateProgress(f.name, index);
          return { 
            name: f.name, 
            data: await f.arrayBuffer() 
          };
        }))
        
        const res = await DriveApiService.uploadFiles(driveId, currentFolderPath, payload)
        completeUpload()
        await onReload()
        toaster.showSuccess('Upload Complete', `Successfully uploaded ${res.uploaded} file(s)`)
      } catch (error) {
        completeUpload()
        toaster.showError('Upload Failed', 'Failed to upload files. Please try again.')
      }
    }
  }, [driveId, onReload, toaster, startUpload, updateProgress, completeUpload])

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
      // Start download progress tracking
      const downloadId = `download-${Date.now()}`
      startDownload(node.name, 0, downloadId, '') // We'll update totalFiles when we get the first progress update
      
      // Open downloads modal to show progress
      onShowDownloads?.()
      
      toaster.showInfo('Download Started', `Downloading folder ${node.name}...`)
      
      const result = await DriveApiService.downloadFolder(driveId, node.id, node.name, currentDrive.name)
      
      if (result?.success) {
        // Update download path before completing
        if (result.downloadPath) {
          console.log('[Download] Setting download path:', result.downloadPath);
          updateDownloadPath(downloadId, result.downloadPath);
        }
        completeDownload(downloadId)
        toaster.showSuccess('Download Complete', `${result.fileCount} files saved to Downloads/HyperTeleporter/${currentDrive.name}/`, {
          label: 'Open Folder',
          onClick: () => DriveApiService.openDownloadsFolder(result.downloadPath!)
        })
        // Dispatch event to refresh downloads modal
        window.dispatchEvent(new CustomEvent('download-completed'))
      } else {
        failDownload(downloadId, result?.error || 'Unknown error')
        toaster.showError('Download Failed', `Failed to download folder: ${result?.error || 'Unknown error'}`)
      }
    } catch (error) {
      const downloadId = `download-${Date.now()}`
      failDownload(downloadId, 'Download failed. Please try again.')
      toaster.showError('Download Failed', 'Failed to download folder. Please try again.')
    }
  }, [driveId, currentDrive, toaster, startDownload, updateDownloadPath, completeDownload, failDownload, onShowDownloads])

  return {
    handleFileUpload,
    handleDeleteNode,
    handleDownloadFile,
    handleDownloadFolder,
  }
}
