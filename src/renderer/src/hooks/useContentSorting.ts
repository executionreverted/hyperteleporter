import { useState, useMemo, useCallback } from 'react'
import { TreeNode } from '../../../components/ui/tree-view'

export type SortCriteria = 'name' | 'size' | 'type' | 'modified'
export type SortDirection = 'asc' | 'desc'

export interface SortConfig {
  criteria: SortCriteria
  direction: SortDirection
}

export function useContentSorting(initialSort: SortConfig = { criteria: 'name', direction: 'asc' }) {
  const [sortConfig, setSortConfig] = useState<SortConfig>(initialSort)

  const sortFiles = useCallback((files: TreeNode[]): TreeNode[] => {
    if (!files || files.length === 0) return files

    return [...files].sort((a, b) => {
      let comparison = 0

      switch (sortConfig.criteria) {
        case 'name':
          comparison = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
          break
        case 'size':
          // For folders, we'll sort by type first, then by name
          if (a.type !== b.type) {
            comparison = a.type === 'folder' ? -1 : 1
          } else if (a.type === 'file' && b.type === 'file') {
            // Parse file sizes for comparison
            const sizeA = parseFileSize(a.size || '0')
            const sizeB = parseFileSize(b.size || '0')
            comparison = sizeA - sizeB
          } else {
            comparison = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
          }
          break
        case 'type':
          // Sort by file extension or folder
          const extA = getFileExtension(a.name)
          const extB = getFileExtension(b.name)
          if (a.type !== b.type) {
            comparison = a.type === 'folder' ? -1 : 1
          } else {
            comparison = extA.localeCompare(extB)
          }
          break
        case 'modified':
          // For now, we'll sort by name since we don't have modified dates
          // In the future, this could be enhanced with actual file timestamps
          comparison = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
          break
        default:
          comparison = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison
    })
  }, [sortConfig])

  const setSortCriteria = useCallback((criteria: SortCriteria) => {
    setSortConfig(prev => ({
      criteria,
      direction: prev.criteria === criteria && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }, [])

  const setSortDirection = useCallback((direction: SortDirection) => {
    setSortConfig(prev => ({ ...prev, direction }))
  }, [])

  const resetSort = useCallback(() => {
    setSortConfig(initialSort)
  }, [initialSort])

  return {
    sortConfig,
    sortFiles,
    setSortCriteria,
    setSortDirection,
    resetSort
  }
}

// Helper function to parse file sizes (e.g., "1.2 MB" -> 1258291 bytes)
function parseFileSize(sizeStr: string): number {
  if (!sizeStr || sizeStr === '0') return 0
  
  const units: { [key: string]: number } = {
    'B': 1,
    'KB': 1024,
    'MB': 1024 * 1024,
    'GB': 1024 * 1024 * 1024,
    'TB': 1024 * 1024 * 1024 * 1024
  }
  
  const match = sizeStr.match(/^([\d.]+)\s*([A-Z]+)$/i)
  if (!match) return 0
  
  const value = parseFloat(match[1])
  const unit = match[2].toUpperCase()
  
  return value * (units[unit] || 1)
}

// Helper function to get file extension
function getFileExtension(filename: string): string {
  const parts = filename.split('.')
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''
}
