import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  drives: {
    list: async () => ipcRenderer.invoke('drives:list'),
    create: async (name: string) => ipcRenderer.invoke('drives:create', name),
    listFolder: async (driveId: string, folder = '/', recursive = false) => ipcRenderer.invoke('drives:listFolder', { driveId, folder, recursive }),
    createFolder: async (driveId: string, folderPath: string) => ipcRenderer.invoke('drives:createFolder', { driveId, folderPath }),
    uploadFiles: async (driveId: string, folderPath: string, files: Array<{ name: string; data: ArrayBuffer }>) => {
      // Convert ArrayBuffer to Uint8Array (safer across IPC)
      const payload = files.map(f => ({ name: f.name, data: new Uint8Array(f.data) }))
      return ipcRenderer.invoke('drives:uploadFiles', { driveId, folderPath, files: payload })
    }
  },
  user: {
    getProfile: async () => ipcRenderer.invoke('user:getProfile'),
    updateProfile: async (profile: Record<string, unknown>) => ipcRenderer.invoke('user:updateProfile', profile)
  },
  files: {
    list: async (_folder?: string) => {
      return []
    },
    getFileUrl: async (driveId: string, path: string) => {
      const data: ArrayBuffer | null = await ipcRenderer.invoke('drives:getFile', { driveId, path })
      if (!data) return null
      
      // For audio files, try a different approach to avoid range request issues
      const extension = path.split('.').pop()?.toLowerCase()
      const isAudio = ['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(extension || '')
      console.log(`[preload] getFileUrl ${path}: extension=${extension}, isAudio=${isAudio}`)
      
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
    },
    getFileText: async (driveId: string, path: string) => {
      const data: ArrayBuffer | null = await ipcRenderer.invoke('drives:getFile', { driveId, path })
      if (!data) return null
      try {
        if ((data as ArrayBuffer).byteLength > 1_000_000) return null
        return new TextDecoder().decode(new Uint8Array(data))
      } catch {
        return null
      }
    }
  }
}

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
