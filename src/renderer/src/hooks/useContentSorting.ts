import { useState, useMemo, useCallback } from 'react'
import { TreeNode } from '../../../components/ui/tree-view'

export type SortCriteria = 'name' | 'size' | 'type' | 'modified' | 'created'
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
          // For size sorting, sort all items by their actual size
          // If sizes are equal or unavailable, fall back to name sorting
          const sizeA = parseFileSize(a.size || '0')
          const sizeB = parseFileSize(b.size || '0')
          
          // If both items have no size info, sort by name
          if (sizeA === 0 && sizeB === 0) {
            comparison = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
          }
          // If one has size and other doesn't, prioritize the one with size
          else if (sizeA === 0 && sizeB > 0) {
            comparison = 1 // No size comes after actual size
          }
          else if (sizeA > 0 && sizeB === 0) {
            comparison = -1 // Actual size comes before no size
          }
          // If both have sizes, sort by size
          else if (sizeA !== sizeB) {
            comparison = sizeA - sizeB
          }
          // If sizes are equal, sort by name
          else {
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
          // Since we don't have modified dates available, sort by name
          // This maintains consistent behavior until timestamp data is available
          comparison = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
          break
        case 'created':
          // Sort by creation time
          const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0
          const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0
          
          if (createdA === createdB) {
            // If creation times are equal, sort by name
            comparison = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
          } else {
            comparison = createdA - createdB
          }
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
