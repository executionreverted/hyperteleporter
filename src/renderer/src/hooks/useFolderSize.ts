import { useState, useEffect } from 'react'

interface FolderSizeResult {
  size: string
  loading: boolean
  error: string | null
}

export function useFolderSize(driveId: string | undefined, folderPath: string | undefined): FolderSizeResult {
  const [size, setSize] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!driveId || !folderPath) {
      setSize('')
      setLoading(false)
      setError(null)
      return
    }

    let mounted = true

    const calculateFolderSize = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api: any = (window as any)?.api
        if (!api?.drives?.getFolderStats) {
          setError('API not available')
          return
        }

        const stats = await api.drives.getFolderStats(driveId, folderPath)
        if (!mounted) return

        const formattedSize = formatBytes(stats.sizeBytes)
        setSize(formattedSize)
      } catch (err: any) {
        if (!mounted) return
        setError(err?.message || 'Failed to calculate size')
        console.warn('Failed to calculate folder size:', err)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    calculateFolderSize()

    return () => {
      mounted = false
    }
  }, [driveId, folderPath])

  return { size, loading, error }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}
