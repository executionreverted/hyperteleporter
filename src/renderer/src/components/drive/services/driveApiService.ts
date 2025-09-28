import { FileEntry } from '../types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getApi = () => (window as any)?.api ?? null

export class DriveApiService {
  /**
   * Lists folder contents
   */
  static async listFolder(
    driveId: string, 
    folder: string, 
    recursive = false
  ): Promise<FileEntry[]> {
    const api = getApi()
    if (api?.drives?.listFolder) {
      return api.drives.listFolder(driveId, folder, recursive)
    }
    
    // Fallback to direct IPC
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const electron = (window as any)?.electron
    if (electron?.ipcRenderer?.invoke) {
      return electron.ipcRenderer.invoke('drives:listFolder', { driveId, folder, recursive })
    }
    
    console.warn('[DriveApiService] listFolder not available (no preload + no ipc)')
    return []
  }

  /**
   * Creates a new folder
   */
  static async createFolder(driveId: string, folderPath: string): Promise<boolean> {
    const api = getApi()
    if (api?.drives?.createFolder) {
      return api.drives.createFolder(driveId, folderPath)
    }
    
    // Fallback to direct IPC
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const electron = (window as any)?.electron
    if (electron?.ipcRenderer?.invoke) {
      return electron.ipcRenderer.invoke('drives:createFolder', { driveId, folderPath })
    }
    
    console.warn('[DriveApiService] createFolder not available (no preload + no ipc)')
    return false
  }

  /**
   * Uploads files to a folder
   */
  static async uploadFiles(
    driveId: string, 
    folderPath: string, 
    files: Array<{ name: string; data: ArrayBuffer }>
  ): Promise<{ uploaded: number }> {
    const api = getApi()
    if (api?.drives?.uploadFiles) {
      return api.drives.uploadFiles(driveId, folderPath, files)
    }
    
    // Fallback to direct IPC
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const electron = (window as any)?.electron
    if (electron?.ipcRenderer?.invoke) {
      // Pass ArrayBuffers; main will normalize to Buffers
      return electron.ipcRenderer.invoke('drives:uploadFiles', {
        driveId,
        folderPath,
        files: files.map(f => ({ name: f.name, data: f.data }))
      })
    }
    
    console.warn('[DriveApiService] uploadFiles not available (no preload + no ipc)')
    return { uploaded: 0 }
  }

  /**
   * Uploads a folder with hierarchy
   */
  static async uploadFolder(
    driveId: string, 
    folderPath: string, 
    files: Array<{ name: string; data: ArrayBuffer; relativePath: string }>
  ): Promise<{ uploaded: number }> {
    const api = getApi()
    if (api?.drives?.uploadFolder) {
      return api.drives.uploadFolder(driveId, folderPath, files)
    }
    
    // Fallback to direct IPC
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const electron = (window as any)?.electron
    if (electron?.ipcRenderer?.invoke) {
      // Pass ArrayBuffers; main will normalize to Buffers
      return electron.ipcRenderer.invoke('drives:uploadFolder', {
        driveId,
        folderPath,
        files: files.map(f => ({ name: f.name, data: f.data, relativePath: f.relativePath }))
      })
    }
    
    console.warn('[DriveApiService] uploadFolder not available (no preload + no ipc)')
    return { uploaded: 0 }
  }

  /**
   * Deletes a file or folder
   */
  static async deleteFile(driveId: string, path: string): Promise<boolean> {
    const api = getApi()
    if (api?.drives?.deleteFile) {
      return api.drives.deleteFile(driveId, path)
    }
    
    // Fallback to direct IPC
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const electron = (window as any)?.electron
    if (electron?.ipcRenderer?.invoke) {
      return electron.ipcRenderer.invoke('drives:deleteFile', { driveId, path })
    }
    
    console.warn('[DriveApiService] deleteFile not available (no preload + no ipc)')
    return false
  }

  /**
   * Downloads a file
   */
  static async downloadFile(
    driveId: string, 
    filePath: string, 
    fileName: string, 
    driveName: string
  ): Promise<{ success: boolean; downloadPath?: string; error?: string }> {
    const api = getApi()
    if (api?.drives?.downloadFile) {
      return api.drives.downloadFile(driveId, filePath, fileName, driveName)
    }
    
    console.warn('[DriveApiService] downloadFile not available')
    return { success: false, error: 'API not available' }
  }

  /**
   * Downloads a folder
   */
  static async downloadFolder(
    driveId: string, 
    folder: string, 
    folderName: string, 
    driveName: string
  ): Promise<{ success: boolean; downloadPath?: string; fileCount?: number; error?: string }> {
    const api = getApi()
    if (api?.drives?.downloadFolder) {
      return api.drives.downloadFolder(driveId, folder, folderName, driveName)
    }
    
    console.warn('[DriveApiService] downloadFolder not available')
    return { success: false, error: 'API not available' }
  }

  /**
   * Checks drive sync status
   */
  static async checkSyncStatus(driveId: string): Promise<{
    isSyncing: boolean
    version: number
    peers: number
    isFindingPeers: boolean
  }> {
    const api = getApi()
    if (api?.drives?.checkSyncStatus) {
      return api.drives.checkSyncStatus(driveId)
    }
    
    console.warn('[DriveApiService] checkSyncStatus not available')
    return { isSyncing: false, version: 0, peers: 0, isFindingPeers: false }
  }

  /**
   * Gets drive list
   */
  static async getDrives(): Promise<Array<{
    id: string
    name: string
    publicKeyHex: string
    createdAt: string
    type?: 'owned' | 'readonly'
  }>> {
    const api = getApi()
    if (api?.drives?.list) {
      return api.drives.list()
    }
    
    console.warn('[DriveApiService] getDrives not available')
    return []
  }

  /**
   * Opens downloads folder
   */
  static async openDownloadsFolder(path: string): Promise<{ success: boolean; error?: string }> {
    const api = getApi()
    if (api?.downloads?.openFolder) {
      return api.downloads.openFolder(path)
    }
    
    console.warn('[DriveApiService] openDownloadsFolder not available')
    return { success: false, error: 'API not available' }
  }
}
