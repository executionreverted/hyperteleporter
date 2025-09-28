import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      drives: {
        list: () => Promise<any[]>
        create: (name: string) => Promise<any>
        join: (name: string, publicKeyHex: string) => Promise<any>
        listFolder: (driveId: string, folder?: string, recursive?: boolean) => Promise<any[]>
        createFolder: (driveId: string, folderPath: string) => Promise<boolean>
        uploadFiles: (driveId: string, folderPath: string, files: Array<{ name: string; data: ArrayBuffer }>) => Promise<{ uploaded: number }>
        deleteFile: (driveId: string, path: string) => Promise<boolean>
        getStorageInfo: (driveId: string) => Promise<{ blobsLength: number, version: number }>
        getFolderStats: (driveId: string, folder: string) => Promise<{ files: number; folders: number; sizeBytes: number }>
        downloadFile: (driveId: string, filePath: string, fileName: string, driveName: string) => Promise<{ success: boolean; downloadPath?: string; error?: string }>
        downloadFolder: (driveId: string, folder: string, folderName: string, driveName: string) => Promise<{ success: boolean; downloadPath?: string; fileCount?: number; error?: string }>
        checkSyncStatus: (driveId: string) => Promise<{ isSyncing: boolean; version: number; peers: number; isFindingPeers: boolean }>
        getSyncStatus: (driveId: string) => Promise<{ isSyncing: boolean }>
      }
      downloads: {
        list: () => Promise<Array<{ id: string; driveId: string; folderPath: string; folderName: string; downloadPath: string; fileCount: number; downloadedAt: string; status: 'completed' | 'failed' }>>
        remove: (id: string) => Promise<boolean>
        openFolder: (path: string) => Promise<{ success: boolean; error?: string }>
      }
      user: {
        getProfile: () => Promise<any>
        updateProfile: (profile: Record<string, unknown>) => Promise<any>
        hasUsername: () => Promise<boolean>
      }
      autolaunch: {
        isEnabled: () => Promise<boolean>
        enable: (options?: { minimized?: boolean; hidden?: boolean }) => Promise<boolean>
        disable: () => Promise<boolean>
        toggle: (options?: { minimized?: boolean; hidden?: boolean }) => Promise<boolean>
        getSettings: () => Promise<{ enabled: boolean; minimized: boolean; hidden: boolean }>
        wasLaunchedAtStartup: () => Promise<boolean>
      }
      files: {
        list: (folder?: string) => Promise<any[]>
        getFileUrl: (driveId: string, path: string) => Promise<string | null>
        getFileText: (driveId: string, path: string) => Promise<string | null>
      }
    }
  }
}
