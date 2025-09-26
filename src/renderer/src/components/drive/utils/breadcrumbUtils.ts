import { BreadcrumbItem } from '../types'
import { truncateText } from './fileSystemUtils'

/**
 * Gets smart breadcrumb path for current tree root
 */
export function getBreadcrumbPath(treeRoot: string): BreadcrumbItem[] {
  if (treeRoot === '/') {
    return [{ name: 'Root', path: '/', isHome: true }]
  }
  
  const pathParts = treeRoot.split('/').filter(Boolean)
  const breadcrumb: BreadcrumbItem[] = [
    { name: 'Root', path: '/', isHome: true }
  ]
  
  // If path is short (3 or fewer parts), show all
  if (pathParts.length <= 3) {
    let currentPath = ''
    for (const part of pathParts) {
      currentPath += `/${part}`
      breadcrumb.push({ name: truncateText(part), path: currentPath })
    }
    return breadcrumb
  }
  
  // For long paths, show: Home > ... > parent > current
  const currentPath = treeRoot
  const parentPath = treeRoot.split('/').slice(0, -1).join('/') || '/'
  const parentName = pathParts[pathParts.length - 2]
  const currentName = pathParts[pathParts.length - 1]
  
  // Collect hidden parent folders for tooltip
  const hiddenParents: Array<{ name: string; path: string }> = []
  let currentHiddenPath = ''
  for (let i = 0; i < pathParts.length - 2; i++) {
    currentHiddenPath += `/${pathParts[i]}`
    hiddenParents.push({ name: pathParts[i], path: currentHiddenPath })
  }
  
  breadcrumb.push(
    { name: '...', path: '', isEllipsis: true, hiddenParents },
    { name: truncateText(parentName), path: parentPath },
    { name: truncateText(currentName), path: currentPath }
  )
  
  return breadcrumb
}
