import { useEffect } from 'react'

interface UseEscapeKeyOptions {
  onEscape: () => void
  isEnabled?: boolean
}

export function useEscapeKey({ onEscape, isEnabled = true }: UseEscapeKeyOptions) {
  useEffect(() => {
    if (!isEnabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onEscape()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onEscape, isEnabled])
}
