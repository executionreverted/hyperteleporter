import { useState, useEffect } from 'react'

interface FolderCreationTimeResult {
  createdAt: string | null
  loading: boolean
  error: string | null
}

export function useFolderCreationTime(driveId: string | undefined, folderPath: string | undefined): FolderCreationTimeResult {
  const [createdAt, setCreatedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!driveId || !folderPath) {
      setCreatedAt(null)
      setLoading(false)
      setError(null)
      return
    }

    let mounted = true

    const getFolderCreationTime = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api: any = (window as any)?.api
        if (!api?.drives?.getFileStats) {
          setError('API not available')
          return
        }

        // Get creation time from the .keep file
        const keepFilePath = folderPath.endsWith('/') ? `${folderPath}.keep` : `${folderPath}/.keep`
        const stats = await api.drives.getFileStats(driveId, keepFilePath)
        if (!mounted) return

        setCreatedAt(stats?.createdAt || null)
      } catch (err: any) {
        if (!mounted) return
        setError(err?.message || 'Failed to get creation time')
        console.warn('Failed to get folder creation time:', err)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    getFolderCreationTime()

    return () => {
      mounted = false
    }
  }, [driveId, folderPath])

  return { createdAt, loading, error }
}
