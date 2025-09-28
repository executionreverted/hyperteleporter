// Download tracking system to prevent duplicate downloads
export interface ActiveDownload {
  id: string
  driveId: string
  filePath: string
  fileName: string
  startTime: number
  type: 'file' | 'folder'
  status: 'downloading' | 'completed' | 'failed' | 'cancelled'
  progress?: {
    currentFile: string
    downloadedFiles: number
    totalFiles: number
  }
}

class DownloadTracker {
  private activeDownloads = new Map<string, ActiveDownload>()
  private downloadPromises = new Map<string, Promise<any>>()

  // Start tracking a download
  startDownload(
    id: string,
    driveId: string,
    filePath: string,
    fileName: string,
    type: 'file' | 'folder',
    downloadPromise: Promise<any>
  ): void {
    const download: ActiveDownload = {
      id,
      driveId,
      filePath,
      fileName,
      startTime: Date.now(),
      type,
      status: 'downloading'
    }

    this.activeDownloads.set(id, download)
    this.downloadPromises.set(id, downloadPromise)

    // Clean up when download completes
    downloadPromise
      .then(() => {
        this.completeDownload(id)
      })
      .catch(() => {
        this.failDownload(id)
      })
  }

  // Check if a file/folder is currently being downloaded
  isDownloading(driveId: string, filePath: string): boolean {
    for (const download of this.activeDownloads.values()) {
      if (download.driveId === driveId && download.filePath === filePath && download.status === 'downloading') {
        return true
      }
    }
    return false
  }

  // Get active download by ID
  getActiveDownload(id: string): ActiveDownload | undefined {
    return this.activeDownloads.get(id)
  }

  // Get all active downloads
  getActiveDownloads(): ActiveDownload[] {
    return Array.from(this.activeDownloads.values())
  }

  // Update download progress
  updateProgress(id: string, progress: { currentFile: string; downloadedFiles: number; totalFiles: number }): void {
    const download = this.activeDownloads.get(id)
    if (download) {
      download.progress = progress
    }
  }

  // Mark download as completed
  completeDownload(id: string): void {
    const download = this.activeDownloads.get(id)
    if (download) {
      download.status = 'completed'
      // Keep completed downloads for a short time for UI updates
      setTimeout(() => {
        this.activeDownloads.delete(id)
        this.downloadPromises.delete(id)
      }, 5000) // Keep for 5 seconds
    }
  }

  // Mark download as failed
  failDownload(id: string): void {
    const download = this.activeDownloads.get(id)
    if (download) {
      download.status = 'failed'
      // Keep failed downloads for a short time for UI updates
      setTimeout(() => {
        this.activeDownloads.delete(id)
        this.downloadPromises.delete(id)
      }, 10000) // Keep for 10 seconds
    }
  }

  // Cancel a download
  cancelDownload(id: string): void {
    const download = this.activeDownloads.get(id)
    if (download) {
      download.status = 'cancelled'
      this.activeDownloads.delete(id)
      this.downloadPromises.delete(id)
    }
  }

  // Get download by file path
  getDownloadByPath(driveId: string, filePath: string): ActiveDownload | undefined {
    for (const download of this.activeDownloads.values()) {
      if (download.driveId === driveId && download.filePath === filePath) {
        return download
      }
    }
    return undefined
  }

  // Clean up old downloads (call periodically)
  cleanup(): void {
    const now = Date.now()
    const maxAge = 30 * 60 * 1000 // 30 minutes

    for (const [id, download] of this.activeDownloads.entries()) {
      if (now - download.startTime > maxAge) {
        this.activeDownloads.delete(id)
        this.downloadPromises.delete(id)
      }
    }
  }
}

// Singleton instance
export const downloadTracker = new DownloadTracker()

// Clean up old downloads every 5 minutes
setInterval(() => {
  downloadTracker.cleanup()
}, 5 * 60 * 1000)
