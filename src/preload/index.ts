import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  drives: {
    list: async () => ipcRenderer.invoke('drives:list'),
    create: async (name: string) => ipcRenderer.invoke('drives:create', name),
    join: async (name: string, publicKeyHex: string) => ipcRenderer.invoke('drives:join', { name, publicKeyHex }),
    listFolder: async (driveId: string, folder = '/', recursive = false) => ipcRenderer.invoke('drives:listFolder', { driveId, folder, recursive }),
    createFolder: async (driveId: string, folderPath: string) => ipcRenderer.invoke('drives:createFolder', { driveId, folderPath }),
    uploadFiles: async (driveId: string, folderPath: string, files: Array<{ name: string; data: ArrayBuffer }>) => {
      // Convert ArrayBuffer to Uint8Array (safer across IPC)
      const payload = files.map(f => ({ name: f.name, data: new Uint8Array(f.data) }))
      return ipcRenderer.invoke('drives:uploadFiles', { driveId, folderPath, files: payload })
    },
    uploadFileStream: async (driveId: string, folderPath: string, fileName: string, fileData: ArrayBuffer) => {
      // Convert ArrayBuffer to Uint8Array for streaming upload
      return ipcRenderer.invoke('drives:uploadFileStream', { driveId, folderPath, fileName, fileData: new Uint8Array(fileData) })
    },
    uploadFolder: async (driveId: string, folderPath: string, files: Array<{ name: string; data: ArrayBuffer; relativePath: string }>) => {
      // Convert ArrayBuffer to Uint8Array (safer across IPC)
      const payload = files.map(f => ({ name: f.name, data: new Uint8Array(f.data), relativePath: f.relativePath }))
      return ipcRenderer.invoke('drives:uploadFolder', { driveId, folderPath, files: payload })
    },
    deleteFile: async (driveId: string, path: string) => ipcRenderer.invoke('drives:deleteFile', { driveId, path }),
    clearContent: async (driveId: string) => ipcRenderer.invoke('drive:clearContent', { driveId }),
    getStorageInfo: async (driveId: string) => ipcRenderer.invoke('drives:getStorageInfo', { driveId }),
    getFolderStats: async (driveId: string, folder: string) => ipcRenderer.invoke('drives:getFolderStats', { driveId, folder }),
    getFileStats: async (driveId: string, path: string) => ipcRenderer.invoke('drives:getFileStats', { driveId, path }),
    getFile: async (driveId: string, path: string) => ipcRenderer.invoke('drives:getFile', { driveId, path }),
    downloadFile: async (driveId: string, filePath: string, fileName: string, driveName: string, downloadId?: string) => ipcRenderer.invoke('drives:downloadFile', { driveId, filePath, fileName, driveName, downloadId }),
    downloadFolder: async (driveId: string, folder: string, folderName: string, driveName: string) => ipcRenderer.invoke('drives:downloadFolder', { driveId, folder, folderName, driveName }),
    checkSyncStatus: async (driveId: string) => ipcRenderer.invoke('drives:checkSyncStatus', { driveId }),
    getSyncStatus: async (driveId: string) => ipcRenderer.invoke('drives:getSyncStatus', { driveId })
  },
  // Expose drive removal to renderer to avoid direct ipcRenderer usage
  removeDrive: async (driveId: string) => ipcRenderer.invoke('drives:removeDrive', { driveId }),
  downloads: {
    list: async () => ipcRenderer.invoke('downloads:list'),
    remove: async (id: string) => ipcRenderer.invoke('downloads:remove', { id }),
    openFolder: async (path: string) => ipcRenderer.invoke('downloads:openFolder', { path }),
    getActive: async () => ipcRenderer.invoke('downloads:getActive'),
    isDownloading: async (driveId: string, filePath: string) => ipcRenderer.invoke('downloads:isDownloading', { driveId, filePath }),
    cancel: async (id: string) => ipcRenderer.invoke('downloads:cancel', { id })
  },
  user: {
    getProfile: async () => ipcRenderer.invoke('user:getProfile'),
    updateProfile: async (profile: Record<string, unknown>) => ipcRenderer.invoke('user:updateProfile', profile),
    hasUsername: async () => {
      const profile = await ipcRenderer.invoke('user:getProfile')
      const name = (profile as any)?.name
      return !!(name && typeof name === 'string' && name.trim().length > 0)
    }
  },
  autolaunch: {
    isEnabled: async () => ipcRenderer.invoke('autolaunch:isEnabled'),
    enable: async (options: { minimized?: boolean; hidden?: boolean } = {}) => ipcRenderer.invoke('autolaunch:enable', options),
    disable: async () => ipcRenderer.invoke('autolaunch:disable'),
    toggle: async (options: { minimized?: boolean; hidden?: boolean } = {}) => ipcRenderer.invoke('autolaunch:toggle', options),
    getSettings: async () => ipcRenderer.invoke('autolaunch:getSettings'),
    wasLaunchedAtStartup: async () => ipcRenderer.invoke('autolaunch:wasLaunchedAtStartup')
  },
  files: {
    list: async (_folder?: string) => {
      return []
    },
    downloadFile: async (driveId: string, path: string) => {
      console.log(`[preload] downloadFile ${path}`)
      const success = await ipcRenderer.invoke('drives:downloadFileForPreview', { driveId, path })
      return success
    },
    getFileUrl: async (driveId: string, path: string) => {
      try {
        const data: ArrayBuffer | string | null = await ipcRenderer.invoke('drives:getFile', { driveId, path })
        
        // Handle special indicators from the backend
        if (data === 'FILE_TOO_LARGE') {
          console.warn(`[preload] getFileUrl ${path}: file too large for preview`)
          return 'FILE_TOO_LARGE'
        }
        
        if (data === 'FILE_TOO_LARGE_CHUNKED') {
          console.warn(`[preload] getFileUrl ${path}: chunked file too large for preview`)
          return 'FILE_TOO_LARGE_CHUNKED'
        }
        
        if (!data || typeof data === 'string') return null
        
        const extension = path.split('.').pop()?.toLowerCase()
        const isAudio = ['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(extension || '')
        const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')
        const isVideo = ['mp4', 'webm', 'mov'].includes(extension || '')
        const isMedia = isAudio || isImage || isVideo
        
        console.log(`[preload] getFileUrl ${path}: extension=${extension}, isMedia=${isMedia}, size=${data.byteLength}`)
        
        if (isAudio) {
          // Use same logic as mp4/video: make a Blob without forcing MIME and return URL
          const uint8Array = new Uint8Array(data)
          const blob = new Blob([uint8Array])
          const url = URL.createObjectURL(blob)
          console.log(`[preload] getFileUrl ${path} (audio as blob): bytes=${uint8Array.length}, url=${url}`)
          return url
        } else {
          // For other files (images, video), use the standard approach
          const uint8Array = new Uint8Array(data)
          const blob = new Blob([uint8Array])
          const url = URL.createObjectURL(blob)
          console.log(`[preload] getFileUrl ${path}: data length=${data.byteLength}, uint8Array length=${uint8Array.length}, blob size=${blob.size}, url=${url}`)
          return url
        }
      } catch (error) {
        console.warn(`[preload] getFileUrl failed for ${path}, starting background download:`, error)
        
        // If fetch failed, start a background download (non-blocking)
        try {
          await ipcRenderer.invoke('drives:downloadFile', { driveId, path })
          console.log(`[preload] Background download started for ${path}`)
        } catch (downloadError) {
          console.error(`[preload] Background download failed for ${path}:`, downloadError)
        }
        
        return null
      }
    },
    getFileText: async (driveId: string, path: string) => {
      const data: ArrayBuffer | string | null = await ipcRenderer.invoke('drives:getFile', { driveId, path })
      
      // Handle special indicators from the backend
      if (data === 'FILE_TOO_LARGE' || data === 'FILE_TOO_LARGE_CHUNKED') {
        return null
      }
      
      if (!data || typeof data === 'string') return null
      try {
        if ((data as ArrayBuffer).byteLength > 1_000_000) return null
        return new TextDecoder().decode(new Uint8Array(data))
      } catch {
        return null
      }
    }
  }
}

// Download progress events
ipcRenderer.on('download-progress', (_, data) => {
  // Forward to renderer
  window.dispatchEvent(new CustomEvent('download-progress', { detail: data }))
})

// Clear content progress events
ipcRenderer.on('clear-content-progress', (_, data) => {
  // Forward to renderer
  window.dispatchEvent(new CustomEvent('clear-content-progress', { detail: data }))
})

// Drives lifecycle events forwarding
ipcRenderer.on('drives:initialized', () => {
  window.dispatchEvent(new CustomEvent('drives:initialized'))
})

ipcRenderer.on('drive:removed', (_evt, payload) => {
  window.dispatchEvent(new CustomEvent('drive:removed', { detail: payload }))
})

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
