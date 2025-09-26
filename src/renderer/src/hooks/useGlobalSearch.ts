import { useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'

interface UseGlobalSearchOptions {
  onSearchTriggered?: () => void
  searchInputRef?: React.RefObject<HTMLInputElement>
}

export function useGlobalSearch({ onSearchTriggered, searchInputRef }: UseGlobalSearchOptions = {}) {
  const location = useLocation()

  const handleGlobalSearch = useCallback(() => {
    if (onSearchTriggered) {
      onSearchTriggered()
    } else if (searchInputRef?.current) {
      // Focus the search input
      searchInputRef.current.focus()
      searchInputRef.current.select()
    }
  }, [onSearchTriggered, searchInputRef])

  useEffect(() => {
    // Set up the global search listener
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cleanup = (window as any).api?.onGlobalSearchTriggered?.(handleGlobalSearch)
    
    return () => {
      if (cleanup) {
        cleanup()
      }
    }
  }, [handleGlobalSearch])

  return {
    triggerSearch: handleGlobalSearch
  }
}
