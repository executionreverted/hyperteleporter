import { useCallback, useEffect, useMemo } from 'react'
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
    console.log('[Upload Debug] Starting upload with:', {
      driveId,
      filesCount: files?.length,
      currentFolderPath,
      files: files?.map(f => ({ name: f.name, webkitPath: f.webkitRelativePath }))
    });
    
    if (!driveId || !files?.length) return
    
    // Separate individual files from folder files
    const individualFiles: File[] = [];
    const folderFiles: File[] = [];
    
    for (const file of files) {
      if (file.webkitRelativePath && file.webkitRelativePath.includes('/')) {
        folderFiles.push(file);
      } else {
        individualFiles.push(file);
      }
    }
    
    console.log('[Upload Debug] Separated files:', {
      individualFiles: individualFiles.length,
      folderFiles: folderFiles.length
    });
    
    // Handle individual files first
    if (individualFiles.length > 0) {
      console.log('[Upload Debug] Processing individual files:', individualFiles.map(f => ({
        name: f.name,
        size: f.size,
        type: f.type,
        lastModified: f.lastModified
      })));
      
      startUpload(individualFiles.length, '')
      toaster.showInfo('Upload Started', `Uploading ${individualFiles.length} file(s)...`)
      
      try {
        const CHUNK_THRESHOLD = 10 * 1024 * 1024 // 10MB threshold for chunking
        let uploadedCount = 0
        
        // Process files one by one to handle large files with streaming
        for (let i = 0; i < individualFiles.length; i++) {
          const f = individualFiles[i]
          console.log(`[Upload Debug] Processing individual file ${i + 1}/${individualFiles.length}:`, f.name);
          updateProgress(f.name, i + 1);
          
          try {
            if (f.size > CHUNK_THRESHOLD) {
              console.log(`[Upload Debug] Large file detected (${f.size} bytes), using streaming upload for ${f.name}`);
              
              // For very large files, we need to handle them differently
              // Since we can't load the entire file into memory, we'll use a different approach
              // For now, let's try to read it in smaller chunks and see if that works
              try {
                const data = await f.arrayBuffer();
                console.log(`[Upload Debug] Successfully read large file ${f.name}, size: ${data.byteLength} bytes`);
                
                const result = await DriveApiService.uploadFileStream(driveId, currentFolderPath, f.name, data)
                
                if (result.success) {
                  uploadedCount++
                  console.log(`[Upload Debug] Successfully uploaded large file: ${f.name}`);
                } else {
                  console.error(`[Upload Debug] Failed to upload large file ${f.name}:`, result.error);
                  throw new Error(`Failed to upload ${f.name}: ${result.error}`);
                }
              } catch (arrayBufferError) {
                console.error(`[Upload Debug] Failed to read large file ${f.name} into memory:`, arrayBufferError);
                // If we can't read the file into memory, show a helpful error
                throw new Error(`File "${f.name}" is too large (${Math.round(f.size / 1024 / 1024)}MB) to upload. Please try uploading smaller files or use a different method.`);
              }
            } else {
              // For smaller files, use regular upload
              const data = await f.arrayBuffer();
              console.log(`[Upload Debug] Successfully read file ${f.name}, size: ${data.byteLength} bytes`);
              
              const res = await DriveApiService.uploadFiles(driveId, currentFolderPath, [{ name: f.name, data }])
              uploadedCount += res.uploaded
              console.log(`[Upload Debug] Successfully uploaded file: ${f.name}`);
            }
          } catch (fileError) {
            console.error(`[Upload Debug] Error processing file ${f.name}:`, fileError);
            throw fileError;
          }
        }
        
        completeUpload()
        await onReload()
        toaster.showSuccess('Upload Complete', `Successfully uploaded ${uploadedCount} file(s)`)
      } catch (error) {
        console.error('[Upload Debug] Individual files upload error:', error);
        completeUpload()
        toaster.showError('Upload Failed', `Failed to upload files: ${error instanceof Error ? error.message : 'Unknown error'}`)
        return
      }
    }
    
    // Handle folder files
    if (folderFiles.length > 0) {
      console.log('[Upload Debug] Processing folder files:', folderFiles.map(f => ({
        name: f.name,
        webkitPath: f.webkitRelativePath
      })));
      
      // Extract folder name from the first file's webkitRelativePath
      const firstFile = folderFiles[0];
      if (!firstFile.webkitRelativePath) {
        console.error('[Upload Debug] Folder file without webkitRelativePath:', firstFile);
        toaster.showError('Upload Failed', 'Folder files are missing path information');
        return;
      }
      
      const folderName = firstFile.webkitRelativePath.split('/')[0];
      console.log('[Upload Debug] Extracted folder name:', folderName);
      
      // Start upload progress for folder
      startUpload(folderFiles.length, folderName)
      toaster.showInfo('Upload Started', `Uploading folder "${folderName}" with ${folderFiles.length} files...`)
      
      try {
        const CHUNK_THRESHOLD = 10 * 1024 * 1024 // 10MB threshold for chunking
        const targetFolderPath = currentFolderPath === '/' ? `/${folderName}` : `${currentFolderPath}/${folderName}`
        
        console.log('[Upload Debug] Uploading folder to:', targetFolderPath);
        
        // Separate files that need chunking from regular files
        const filesToChunk: File[] = []
        const regularFiles: File[] = []
        
        for (const file of folderFiles) {
          if (file.size > CHUNK_THRESHOLD) {
            filesToChunk.push(file)
            console.log(`[Upload Debug] File needs chunking: ${file.name} (${file.size} bytes)`)
          } else {
            regularFiles.push(file)
          }
        }
        
        let uploadedCount = 0
        
        // Upload files that need chunking using streaming upload
        if (filesToChunk.length > 0) {
          console.log(`[Upload Debug] Uploading ${filesToChunk.length} files using chunked upload`)
          for (let i = 0; i < filesToChunk.length; i++) {
            const file = filesToChunk[i]
            updateProgress(file.name, uploadedCount + 1);
            
            const webkitPath = file.webkitRelativePath || file.name;
            const relativePath = webkitPath.startsWith(`${folderName}/`)
              ? webkitPath.substring(folderName.length + 1)
              : webkitPath;
            
            try {
              const data = await file.arrayBuffer();
              const result = await DriveApiService.uploadFileStream(driveId, targetFolderPath, relativePath, data);
              
              if (result.success) {
                uploadedCount++;
                console.log(`[Upload Debug] Successfully uploaded chunked file: ${relativePath}`);
              } else {
                console.error(`[Upload Debug] Failed to upload chunked file ${relativePath}: ${result.error}`);
              }
            } catch (error) {
              console.error(`[Upload Debug] Error uploading chunked file ${relativePath}:`, error);
            }
          }
        }
        
        // Upload regular files using normal method, batched to avoid OOM
        if (regularFiles.length > 0) {
          console.log(`[Upload Debug] Uploading ${regularFiles.length} regular files using batched method`)
          const BATCH_SIZE = 10
          for (let start = 0; start < regularFiles.length; start += BATCH_SIZE) {
            const batch = regularFiles.slice(start, start + BATCH_SIZE)
            // Read a small batch into memory at a time
            const uploadFiles = [] as Array<{ name: string; data: ArrayBuffer; relativePath: string }>
            for (let i = 0; i < batch.length; i++) {
              const file = batch[i]
              updateProgress(file.name, uploadedCount + start + i + 1)
              const data = await file.arrayBuffer()
              const webkitPath = file.webkitRelativePath || file.name
              const relativePath = webkitPath.startsWith(`${folderName}/`)
                ? webkitPath.substring(folderName.length + 1)
                : webkitPath
              uploadFiles.push({ name: file.name, data, relativePath })
            }
            const res = await DriveApiService.uploadFolder(driveId, targetFolderPath, uploadFiles)
            uploadedCount += res.uploaded
          }
        }
        
        completeUpload()
        await onReload()
        toaster.showSuccess('Upload Complete', `Successfully uploaded folder "${folderName}" with ${uploadedCount} file(s)`)
      } catch (e) {
        console.error('[Upload Debug] Folder upload error:', e);
        completeUpload()
        toaster.showError('Upload Failed', `Failed to upload folder: ${e instanceof Error ? e.message : 'Unknown error'}`)
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
      const downloadId = `download-${Date.now()}`
      
      // Start download progress tracking
      startDownload(node.name, 0, downloadId, '') // We'll update totalFiles when we get the first progress update
      
      // Open downloads modal to show progress
      onShowDownloads?.()
      
      toaster.showInfo('Download Started', `Downloading ${node.name}...`)
      
      const result = await DriveApiService.downloadFile(driveId, node.id, node.name, currentDrive.name, downloadId)
      
      if (result?.success) {
        completeDownload(downloadId)
        toaster.showSuccess('Download Complete', `${node.name} saved to Downloads/HyperTeleporter/${currentDrive.name}/`, {
          label: 'Open Folder',
          onClick: () => DriveApiService.openDownloadsFolder(result.downloadPath!)
        })
        // Dispatch event to refresh downloads modal
        window.dispatchEvent(new CustomEvent('download-completed'))
      } else {
        failDownload(downloadId, result?.error || 'Unknown error')
        toaster.showError('Download Failed', `Failed to download file: ${result?.error || 'Unknown error'}`)
      }
    } catch (error) {
      const downloadId = `download-${Date.now()}`
      failDownload(downloadId, String(error))
      toaster.showError('Download Failed', 'Failed to download file. Please try again.')
    }
  }, [driveId, currentDrive, toaster, startDownload, completeDownload, failDownload, onShowDownloads])

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

  return useMemo(() => ({
    handleFileUpload,
    handleDeleteNode,
    handleDownloadFile,
    handleDownloadFolder,
  }), [
    handleFileUpload,
    handleDeleteNode,
    handleDownloadFile,
    handleDownloadFolder,
  ])
}
