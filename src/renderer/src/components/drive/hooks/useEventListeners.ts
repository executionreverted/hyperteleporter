import { useEffect, useCallback, useRef } from 'react'

interface UseEventListenersProps {
  driveId: string | undefined
  onReload: () => Promise<void>
}

export function useEventListeners({
  driveId,
  onReload
}: UseEventListenersProps) {
  // Store callback in ref to avoid dependency issues
  const onReloadRef = useRef(onReload)
  onReloadRef.current = onReload

  // Live change subscription: refresh on backend watcher events
  useEffect(() => {
    // @ts-ignore
    const { ipcRenderer } = (window as any)?.electron || {}
    if (!ipcRenderer) return
    
    let retryTimer: number | null = null
    const handler = (_event: any, payload: { driveId: string }) => {
      const currentId = driveId
      if (payload?.driveId !== currentId) return
      onReloadRef.current()
      if (retryTimer) window.clearTimeout(retryTimer)
      // @ts-ignore - setTimeout returns number
      retryTimer = window.setTimeout(() => {
        onReloadRef.current()
        retryTimer = null
      }, 300)
    }
    
    ipcRenderer.on('drive:changed', handler)
    return () => {
      if (retryTimer) window.clearTimeout(retryTimer)
      try { ipcRenderer.removeListener('drive:changed', handler) } catch {}
    }
  }, [driveId])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      // Cleanup any pending timeouts
    }
  }, [])

  return {}
}
