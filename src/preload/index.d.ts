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
      }
      user: {
        getProfile: () => Promise<any>
        updateProfile: (profile: Record<string, unknown>) => Promise<any>
        hasUsername: () => Promise<boolean>
      }
      files: {
        list: (folder?: string) => Promise<any[]>
        getFileUrl: (driveId: string, path: string) => Promise<string | null>
        getFileText: (driveId: string, path: string) => Promise<string | null>
      }
    }
  }
}
