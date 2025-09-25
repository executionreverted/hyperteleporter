import React, { useState, useEffect, useMemo } from 'react'
import { IconX, IconDownload, IconTrash, IconFolderOpen, IconClock } from '@tabler/icons-react'

interface DownloadRecord {
  id: string
  driveId: string
  folderPath: string
  folderName: string
  downloadPath: string
  fileCount: number
  downloadedAt: string
  status: 'completed' | 'failed'
}

interface DownloadsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function DownloadsModal({ isOpen, onClose }: DownloadsModalProps) {
  const [downloads, setDownloads] = useState<DownloadRecord[]>([])
  const [loading, setLoading] = useState(false)
  const api = useMemo(() => (window as any)?.api ?? null, [])

  const loadDownloads = async () => {
    setLoading(true)
    try {
      const data = await api?.downloads?.list?.()
      setDownloads(data || [])
    } catch (error) {
      console.error('Failed to load downloads:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadDownloads()
    }
  }, [isOpen])

  // Listen for download completion events to refresh the list
  useEffect(() => {
    const handleDownloadComplete = () => {
      if (isOpen) {
        loadDownloads()
      }
    }

    window.addEventListener('download-completed', handleDownloadComplete)
    return () => window.removeEventListener('download-completed', handleDownloadComplete)
  }, [isOpen])

  const handleRemoveDownload = async (id: string) => {
    try {
      await api?.downloads?.remove?.(id)
      setDownloads(prev => prev.filter(d => d.id !== id))
    } catch (error) {
      console.error('Failed to remove download:', error)
    }
  }

  const handleOpenFolder = async (downloadPath: string) => {
    try {
      const result = await api?.downloads?.openFolder?.(downloadPath)
      if (!result?.success) {
        console.error('Failed to open folder:', result?.error)
        alert(`Failed to open folder: ${result?.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Failed to open folder:', error)
      alert('Failed to open folder. Please try again.')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 rounded-2xl border border-white/10 w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <IconDownload size={24} className="text-blue-400" />
            <h2 className="text-xl font-semibold text-white">Downloads</h2>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-neutral-400">Loading downloads...</div>
            </div>
          ) : downloads.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-neutral-400">
                <IconDownload size={48} className="mx-auto mb-4 opacity-50" />
                <p>No downloads yet</p>
                <p className="text-sm mt-2">Download folders from your drives to see them here</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-3">
                {downloads.map((download) => (
                  <div
                    key={download.id}
                    className="bg-neutral-800/50 rounded-lg p-4 border border-white/5 hover:border-white/10 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <IconFolderOpen size={16} className="text-blue-400 flex-shrink-0" />
                          <h3 className="font-medium text-white truncate">{download.folderName}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            download.status === 'completed' 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {download.status}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-neutral-400">
                          <div className="flex items-center gap-1">
                            <IconClock size={14} />
                            <span>{formatDate(download.downloadedAt)}</span>
                          </div>
                          <div>
                            {download.fileCount} file{download.fileCount !== 1 ? 's' : ''}
                          </div>
                          <div className="truncate max-w-xs">
                            {download.downloadPath}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handleOpenFolder(download.downloadPath)}
                          className="p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                          title="Open folder"
                        >
                          <IconFolderOpen size={16} />
                        </button>
                        <button
                          onClick={() => handleRemoveDownload(download.id)}
                          className="p-2 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Remove from list"
                        >
                          <IconTrash size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
