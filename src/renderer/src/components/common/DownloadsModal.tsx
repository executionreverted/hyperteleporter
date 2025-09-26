import React, { useState, useEffect, useMemo } from 'react'
import { IconX, IconDownload, IconTrash, IconFolderOpen, IconClock } from '@tabler/icons-react'
import { useEscapeKey } from '../../hooks/useEscapeKey'

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

  // Add ESC key functionality
  useEscapeKey({
    onEscape: onClose,
    isEnabled: isOpen
  })

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-neutral-950 rounded-2xl border border-white/10 w-full max-w-5xl h-[80vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-2 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-1" />
          <div className="flex items-center gap-1">
            <button onClick={onClose} className="text-neutral-400 hover:text-white px-2 py-1" title="Close">✕</button>
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[80vh] overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-neutral-800 hover:scrollbar-thumb-neutral-500">
          {loading ? (
            <div className="flex items-center justify-center min-h-[200px] p-4">
              <div className="flex items-center gap-3 text-neutral-300">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-400 border-t-transparent"></div>
                <span>Loading downloads...</span>
              </div>
            </div>
          ) : downloads.length === 0 ? (
            <div className="flex items-center justify-center min-h-[300px] p-4">
              <div className="text-center">
                <div className="relative mb-6">
                  <div className="p-6 bg-white/5 rounded-2xl w-24 h-24 mx-auto flex items-center justify-center border border-white/10">
                    <IconDownload size={40} className="text-neutral-400" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-neutral-800 rounded-full border-2 border-neutral-950 flex items-center justify-center">
                    <div className="w-2 h-2 bg-neutral-600 rounded-full"></div>
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">No downloads yet</h3>
                <p className="text-neutral-400 mb-6 max-w-md">
                  Download folders from your drives to see them here. 
                  Use the download button on any folder to get started.
                </p>
                <div className="flex items-center justify-center gap-2 text-xs text-neutral-500">
                  <div className="w-1 h-1 bg-neutral-500 rounded-full"></div>
                  <span>Downloads will appear here automatically</span>
                  <div className="w-1 h-1 bg-neutral-500 rounded-full"></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {downloads.map((download) => (
                <div
                  key={download.id}
                  className="group bg-white/5 rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all duration-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg group-hover:bg-blue-500/30 transition-colors">
                          <IconFolderOpen size={16} className="text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white truncate text-lg">{download.folderName}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              download.status === 'completed' 
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                                : 'bg-red-500/20 text-red-400 border border-red-500/30'
                            }`}>
                              {download.status}
                            </span>
                            <span className="text-xs text-neutral-400">
                              {download.fileCount} file{download.fileCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6 text-sm text-neutral-300 ml-11">
                        <div className="flex items-center gap-2">
                          <IconClock size={14} className="text-neutral-400" />
                          <span>{formatDate(download.downloadedAt)}</span>
                        </div>
                        <div className="truncate max-w-xs text-neutral-400 font-mono text-xs">
                          {download.downloadPath}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        onClick={() => handleOpenFolder(download.downloadPath)}
                        className="p-2.5 text-neutral-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200 hover:scale-105"
                        title="Open folder"
                      >
                        <IconFolderOpen size={16} />
                      </button>
                      <button
                        onClick={() => handleRemoveDownload(download.id)}
                        className="p-2.5 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200 hover:scale-105"
                        title="Remove from list"
                      >
                        <IconTrash size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
