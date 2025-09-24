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
      // Convert ArrayBuffer to Node Buffer for IPC safely
      const payload = files.map(f => ({ name: f.name, data: Buffer.from(f.data) }))
      return ipcRenderer.invoke('drives:uploadFiles', { driveId, folderPath, files: payload })
    }
  },
  user: {
    getProfile: async () => ipcRenderer.invoke('user:getProfile'),
    updateProfile: async (profile: Record<string, unknown>) => ipcRenderer.invoke('user:updateProfile', profile)
  },
  files: {
    list: async (_folder?: string) => {
      // Placeholder for future Hyperdrive-backed files listing via main
      return []
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
