export interface FileWithPath {
  file: File;
  relativePath: string;
  folderName: string;
}

export interface UploadResult {
  files: FileWithPath[];
  folderName: string;
  hasConflicts: boolean;
  conflicts: string[];
  shouldCreateFolder: boolean; // New field to indicate if a folder should be created
}

/**
 * Process uploaded files to preserve folder hierarchy
 * @param files Array of files from webkitdirectory input or drag-and-drop
 * @returns Processed files with folder structure preserved
 */
export function processFolderUpload(files: FileList): UploadResult {
  const fileArray = Array.from(files);
  const filesWithPath: FileWithPath[] = [];
  const conflicts: string[] = [];
  
  if (fileArray.length === 0) {
    return { files: [], folderName: '', hasConflicts: false, conflicts: [], shouldCreateFolder: false };
  }
  
  // Check if files have webkitRelativePath (from webkitdirectory input)
  const hasWebkitPaths = fileArray.some(file => file.webkitRelativePath);
  
  if (hasWebkitPaths) {
    // Process webkitdirectory files (click to select folder)
    return processWebkitDirectoryFiles(fileArray);
  } else {
    // Process drag-and-drop files - try to detect folder structure
    return processDragDropFiles(fileArray);
  }
}

function processWebkitDirectoryFiles(fileArray: File[]): UploadResult {
  const filesWithPath: FileWithPath[] = [];
  const conflicts: string[] = [];
  
  // Extract folder name from the first file's path
  const firstFile = fileArray[0];
  if (!firstFile.webkitRelativePath) {
    return { files: [], folderName: '', hasConflicts: false, conflicts: [], shouldCreateFolder: false };
  }
  
  // Get the folder name from the webkitRelativePath
  const folderName = firstFile.webkitRelativePath.split('/')[0];
  
  // Process each file
  for (const file of fileArray) {
    const relativePath = file.webkitRelativePath;
    if (!relativePath) continue;
    
    // Remove folder name from the path to get the relative path within the folder
    const pathWithoutFolder = relativePath.startsWith(folderName + '/') 
      ? relativePath.substring(folderName.length + 1)
      : relativePath;
    
    filesWithPath.push({
      file,
      relativePath: pathWithoutFolder,
      folderName
    });
  }
  
  return {
    files: filesWithPath,
    folderName,
    hasConflicts: conflicts.length > 0,
    conflicts,
    shouldCreateFolder: true
  };
}

function processDragDropFiles(fileArray: File[]): UploadResult {
  const filesWithPath: FileWithPath[] = [];
  const conflicts: string[] = [];
  
  // For drag-and-drop, we can't get the exact folder structure
  // But we can group files by their common path patterns
  // This is a simplified approach - in a real app, you might want to use File System Access API
  
  // Check if files seem to be from the same folder by looking at their paths
  const commonPath = findCommonPath(fileArray.map(f => f.webkitRelativePath || f.name));
  
  if (commonPath) {
    // Files seem to be from a folder - create folder structure
    let folderName = commonPath.split('/')[0];
    
    // Special case: if folder name is "virtual-root", treat as root directory
    if (folderName === 'virtual-root') {
      folderName = '';
    }
    
    for (const file of fileArray) {
      const webkitPath = file.webkitRelativePath;
      const relativePath = webkitPath 
        ? webkitPath.substring(commonPath.length + 1)
        : file.name;
      
      filesWithPath.push({
        file,
        relativePath,
        folderName
      });
    }
    
    return {
      files: filesWithPath,
      folderName,
      hasConflicts: conflicts.length > 0,
      conflicts,
      shouldCreateFolder: folderName !== '' // Don't create folder if it's root
    };
  } else {
    // No common path - don't create a folder, upload files directly
    for (const file of fileArray) {
      filesWithPath.push({
        file,
        relativePath: file.name,
        folderName: '' // Empty folder name indicates direct upload
      });
    }
    
    return {
      files: filesWithPath,
      folderName: '',
      hasConflicts: conflicts.length > 0,
      conflicts,
      shouldCreateFolder: false
    };
  }
}

function findCommonPath(paths: string[]): string | null {
  if (paths.length === 0) return null;
  
  const validPaths = paths.filter(p => p && p.includes('/'));
  if (validPaths.length === 0) return null;
  
  const firstPath = validPaths[0];
  const pathParts = firstPath.split('/');
  
  for (let i = 1; i < pathParts.length; i++) {
    const commonPrefix = pathParts.slice(0, i).join('/');
    if (validPaths.every(path => path.startsWith(commonPrefix + '/'))) {
      return commonPrefix;
    }
  }
  
  return null;
}

/**
 * Check for name conflicts with existing files/folders
 * @param folderName Name of the folder being uploaded
 * @param existingItems List of existing items in the target directory
 * @returns Conflict information
 */
export function checkNameConflicts(
  folderName: string, 
  existingItems: Array<{ name: string; type: 'file' | 'folder' }>
): { hasConflicts: boolean; conflicts: string[] } {
  const conflicts: string[] = [];
  
  // Check if folder name already exists
  const existingFolder = existingItems.find(item => 
    item.name === folderName && item.type === 'folder'
  );
  
  if (existingFolder) {
    conflicts.push(`Folder "${folderName}" already exists`);
  }
  
  return {
    hasConflicts: conflicts.length > 0,
    conflicts
  };
}

/**
 * Convert FileWithPath array to the format expected by the upload API
 * @param filesWithPath Processed files with paths
 * @param targetFolder Target folder path in the drive
 * @returns Array of files ready for upload
 */
export async function prepareFilesForUpload(
  filesWithPath: FileWithPath[],
  targetFolder: string
): Promise<Array<{ name: string; data: ArrayBuffer; relativePath: string }>> {
  const uploadFiles = [];
  
  for (const { file, relativePath } of filesWithPath) {
    const data = await file.arrayBuffer();
    
    uploadFiles.push({
      name: file.name,
      data,
      relativePath: relativePath // Use the relativePath directly, don't combine with targetFolder
    });
  }
  
  return uploadFiles;
}
