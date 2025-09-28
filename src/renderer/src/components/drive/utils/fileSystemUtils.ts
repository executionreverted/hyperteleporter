import { TreeNode, FileEntry } from '../types'

// Helper function to calculate file size from blob data
function calculateFileSize(entryValue: any): string {
  if (!entryValue) return '0 B'
  
  // Try to get size from blob metadata first
  const reported = Number(entryValue?.blob?.byteLength || entryValue?.blob?.length || 0)
  if (reported > 0) {
    return formatBytes(reported)
  }
  
  // If no metadata, return unknown size
  return 'Unknown'
}

// Helper function to extract creation time from .keep files
async function getFolderCreationTime(driveId: string, folderPath: string): Promise<string | undefined> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api: any = (window as any)?.api
    if (!api?.drives?.getFileStats) return undefined
    
    // Get creation time from the .keep file
    const keepFilePath = folderPath.endsWith('/') ? `${folderPath}.keep` : `${folderPath}/.keep`
    const stats = await api.drives.getFileStats(driveId, keepFilePath)
    
    return stats?.createdAt
  } catch (err) {
    console.warn('Failed to get folder creation time:', err)
    return undefined
  }
}

// Helper function to format bytes into human readable format
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

/**
 * Builds tree nodes for a specific folder from file entries
 */
export async function buildNodesForFolder(
  currentFolderPath: string, 
  entries: FileEntry[],
  driveId?: string
): Promise<TreeNode[]> {
  const normalized = currentFolderPath.endsWith('/') ? currentFolderPath : currentFolderPath + '/'
  const folderNames = new Set<string>()
  const files: TreeNode[] = []
  
  for (const e of entries) {
    if (!e.key.startsWith(normalized)) continue
    const rel = e.key.slice(normalized.length)
    if (!rel) continue
    const segments = rel.split('/').filter(Boolean)
    if (segments.length === 0) continue
    
    if (segments.length > 1) {
      // child inside a subfolder ⇒ show top-level folder name only
      folderNames.add(segments[0])
    } else {
      // direct child
      const baseName = segments[0]
      if (baseName === '.keep') continue // hide marker
      const isFile = !!e.value?.blob || !!e.value?.linkname
      if (isFile) {
        // Calculate file size
        const fileSize = calculateFileSize(e.value)
        files.push({ 
          id: e.key, 
          name: baseName, 
          type: 'file',
          size: fileSize
        })
      } else {
        folderNames.add(baseName)
      }
    }
  }
  
  // Build folders with creation times
  const folders: TreeNode[] = []
  for (const name of folderNames) {
    const folderId = normalized + name
    const createdAt = driveId ? await getFolderCreationTime(driveId, folderId) : undefined
    
    folders.push({ 
      id: folderId, 
      name, 
      type: 'folder', 
      children: [],
      createdAt
    })
  }
  
  // Stable sort: folders first, then files, both A→Z
  folders.sort((a, b) => a.name.localeCompare(b.name))
  files.sort((a, b) => a.name.localeCompare(b.name))
  return [...folders, ...files]
}

/**
 * Builds a complete file system tree from all entries
 */
export function buildCompleteFileSystemTree(entries: FileEntry[]): TreeNode[] {
  const tree: { [key: string]: TreeNode } = {}
  
  // First pass: create all nodes (including intermediate folders)
  for (const entry of entries) {
    const key = entry.key
    if (key === '/') continue // skip root
    
    const segments = key.split('/').filter(Boolean)
    if (segments.length === 0) continue
    
    const isFile = !!entry.value?.blob || !!entry.value?.linkname
    
    // Skip .keep files but still create folder structure
    if (segments[segments.length - 1] === '.keep') {
      // Create intermediate folders for .keep files
      for (let i = 1; i < segments.length; i++) {
        const folderPath = '/' + segments.slice(0, i).join('/')
        if (!tree[folderPath]) {
          tree[folderPath] = {
            id: folderPath,
            name: segments[i - 1],
            type: 'folder',
            children: []
          }
        }
      }
      continue
    }
    
    const node: TreeNode = {
      id: key,
      name: segments[segments.length - 1],
      type: isFile ? 'file' : 'folder',
      children: isFile ? undefined : [],
      size: isFile ? calculateFileSize(entry.value) : undefined
    }
    
    tree[key] = node
    
    // Create intermediate folders for nested items
    for (let i = 1; i < segments.length; i++) {
      const folderPath = '/' + segments.slice(0, i).join('/')
      if (!tree[folderPath]) {
        tree[folderPath] = {
          id: folderPath,
          name: segments[i - 1],
          type: 'folder',
          children: []
        }
      }
    }
  }
  
  // Second pass: build hierarchy
  const rootNodes: TreeNode[] = []
  for (const key in tree) {
    const node = tree[key]
    const segments = key.split('/').filter(Boolean)
    
    if (segments.length === 1) {
      // Root level item
      rootNodes.push(node)
    } else {
      // Nested item - find parent
      const parentPath = '/' + segments.slice(0, -1).join('/')
      const parent = tree[parentPath]
      if (parent && parent.type === 'folder' && parent.children) {
        parent.children.push(node)
      }
    }
  }
  
  return rootNodes
}

/**
 * Finds a node by its ID in the complete file system tree
 */
export function findNodeById(nodes: TreeNode[], targetId: string): TreeNode | null {
  for (const node of nodes) {
    if (node.id === targetId) return node
    if (node.children) {
      const found = findNodeById(node.children, targetId)
      if (found) return found
    }
  }
  return null
}

/**
 * Finds a node by path of names (from root)
 */
export function findNodeByPath(nodes: TreeNode[], names: string[]): TreeNode | null {
  let currentNodes: TreeNode[] = nodes
  let found: TreeNode | null = null
  
  for (const name of names) {
    found = (currentNodes || []).find(n => n.name === name) || null
    if (!found) return null
    currentNodes = found.children || []
  }
  return found
}

/**
 * Expands all folders recursively
 */
export function expandAllFolders(nodes: TreeNode[]): Set<string> {
  const expanded = new Set<string>()
  
  const traverse = (nodeList: TreeNode[]) => {
    nodeList.forEach(node => {
      if (node.type === 'folder' && node.children && node.children.length > 0) {
        expanded.add(node.id)
        traverse(node.children)
      }
    })
  }
  
  traverse(nodes)
  return expanded
}

/**
 * Flattens files for debugging
 */
export function flattenFilesForDebug(nodes: TreeNode[], parentPath: string[] = []): string[] {
  const results: string[] = []
  
  for (const node of nodes) {
    const currentPath = [...parentPath, node.name]
    if (node.type === "file") {
      results.push(currentPath.join(" / "))
    } else if (node.children && node.children.length > 0) {
      results.push(...flattenFilesForDebug(node.children, currentPath))
    }
  }
  
  return results
}

/**
 * Processes tree nodes with depth limit and "..." indicator
 */
export function processTreeNodes(
  nodes: TreeNode[], 
  currentDepth: number = 0, 
  maxDepth: number = 8
): TreeNode[] {
  if (currentDepth >= maxDepth) {
    return []
  }
  
  return nodes.map(node => {
    const processedNode: TreeNode = {
      ...node,
      children: node.children ? processTreeNodes(node.children, currentDepth + 1, maxDepth) : []
    }
    
    // If we're at max depth and there are more children, add "..." indicator
    if (currentDepth === maxDepth - 1 && node.children && node.children.length > 0) {
      const moreIndicator: TreeNode = {
        id: `${node.id}/__more__`,
        name: '...',
        type: 'folder',
        children: []
      }
      processedNode.children = [moreIndicator]
    }
    
    return processedNode
  })
}

/**
 * Truncates text to specified length
 */
export function truncateText(text: string, maxLength: number = 12): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 3) + '...'
}
