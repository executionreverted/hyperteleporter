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
    // Set up local keyboard shortcut listener (only works when app is focused)
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl+F (Windows/Linux) or Cmd+F (macOS)
      if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
        event.preventDefault() // Prevent browser search
        handleGlobalSearch()
      }
    }

    // Add the event listener to the document
    document.addEventListener('keydown', handleKeyDown)
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleGlobalSearch])

  return {
    triggerSearch: handleGlobalSearch
  }
}
