import { TreeNode, FileEntry } from '../types'

/**
 * Builds tree nodes for a specific folder from file entries
 */
export function buildNodesForFolder(
  currentFolderPath: string, 
  entries: FileEntry[]
): TreeNode[] {
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
        files.push({ id: e.key, name: baseName, type: 'file' })
      } else {
        folderNames.add(baseName)
      }
    }
  }
  
  const folders: TreeNode[] = Array.from(folderNames).map((name) => ({ 
    id: normalized + name, 
    name, 
    type: 'folder', 
    children: [] 
  }))
  
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
      children: isFile ? undefined : []
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
