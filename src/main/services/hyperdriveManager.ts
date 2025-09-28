import Corestore from 'corestore'
import Hyperdrive from 'hyperdrive'
import { join } from 'path'
import { getHyperdriveBaseDir } from './appPaths'
import { setupDriveReplication, cleanupDriveSwarm, destroyAllSwarms } from './swarm'
import { BrowserWindow } from 'electron'
import { randomUUID } from 'crypto'
import {
  addOrUpdateDrive,
  DriveRecord,
  listDriveRecords
} from './driveRegistry'

export type InitializedDrive = {
  record: DriveRecord
  corestore: Corestore
  hyperdrive: Hyperdrive
  isSyncing: boolean
}

const activeDrives = new Map<string, InitializedDrive>()
const activeWatchers = new Map<string, { watcher: AsyncIterableIterator<any>; running: boolean }>()

async function startDriveWatcher(id: string, hyperdrive: Hyperdrive): Promise<void> {
  if (activeWatchers.has(id)) return
  try {
    // @ts-ignore - hyperdrive watch exists at runtime
    const watcher: any = (hyperdrive as any).watch('/')
    if (watcher && typeof watcher.ready === 'function') {
      await watcher.ready()
    }
    const state = { watcher, running: true }
    activeWatchers.set(id, state)
    ;(async () => {
      try {
        for await (const _change of watcher) { // eslint-disable-line @typescript-eslint/no-unused-vars
          // Broadcast to all renderer windows that this drive changed
          const windows = BrowserWindow.getAllWindows()
          for (const win of windows) {
            try {
              win.webContents.send('drive:changed', { driveId: id })
            } catch {}
          }
        }
      } catch (err) {
        console.warn(`[hyperdrive] watcher loop ended for drive ${id}`, err)
      } finally {
        activeWatchers.delete(id)
        try { await watcher?.destroy?.() } catch {}
      }
    })()
  } catch (err) {
    console.warn(`[hyperdrive] failed to start watcher for drive ${id}`, err)
  }
}

export async function stopAllDriveWatchers(): Promise<void> {
  const entries = Array.from(activeWatchers.entries())
  activeWatchers.clear()
  await Promise.all(entries.map(async ([, w]) => {
    try { await (w.watcher as any)?.destroy?.() } catch {}
  }))
}

function broadcastDriveChanged(driveId: string): void {
  const windows = BrowserWindow.getAllWindows()
  for (const win of windows) {
    try { win.webContents.send('drive:changed', { driveId }) } catch {}
  }
}

function resolveStorageDir(id: string): string {
  return join(getHyperdriveBaseDir(), 'stores', id)
}

export async function createDrive(name: string): Promise<InitializedDrive> {
  const id = randomUUID()
  const storageDir = resolveStorageDir(id)
  const corestore = new Corestore(storageDir)
  const hyperdrive = new Hyperdrive(corestore)
  await hyperdrive.ready()

  // Setup swarm replication for this drive
  await setupDriveReplication(id, hyperdrive)
  await startDriveWatcher(id, hyperdrive)

  const record: DriveRecord = {
    id,
    name,
    storageDir,
    publicKeyHex: hyperdrive.key.toString('hex'),
    contentKeyHex: hyperdrive.contentKey?.toString('hex'),
    createdAt: new Date().toISOString(),
    type: 'owned'
  }

  await addOrUpdateDrive(record)

  const initialized: InitializedDrive = { record, corestore, hyperdrive, isSyncing: false }
  activeDrives.set(id, initialized)
  return initialized
}

export async function initializeAllDrives(): Promise<InitializedDrive[]> {
  const records = await listDriveRecords()
  const initialized: InitializedDrive[] = []
  
  console.log(`[hyperdrive] initializeAllDrives: Found ${records.length} drive records to initialize`)
  
  for (const record of records) {
    try {
      console.log(`[hyperdrive] initializeAllDrives: Initializing drive ${record.id} (${record.name}, type: ${record.type ?? 'owned'})`)
      
      const corestore = new Corestore(record.storageDir)
      const hyperdrive = new Hyperdrive(corestore, Buffer.from(record.publicKeyHex, 'hex'))
      
      // Add timeout to hyperdrive.ready() to prevent hanging
      await Promise.race([
        hyperdrive.ready(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('hyperdrive.ready() timeout')), 10000)
        )
      ])
      
      await setupDriveReplication(record.id, hyperdrive)
      await startDriveWatcher(record.id, hyperdrive)
      
      // Ensure backward compatibility: default type to 'owned' if missing
      const normalizedRecord: DriveRecord = { ...record, type: record.type ?? 'owned' }
      const drive: InitializedDrive = { record: normalizedRecord, corestore, hyperdrive, isSyncing: false }
      activeDrives.set(record.id, drive)
      initialized.push(drive)
      
      console.log(`[hyperdrive] initializeAllDrives: Successfully initialized drive ${record.id}`)
    } catch (err) {
      console.error(`[hyperdrive] initializeAllDrives: Failed to initialize drive ${record.id} (${record.name}):`, err)
      // Continue with other drives even if one fails
    }
  }
  
  console.log(`[hyperdrive] initializeAllDrives: Successfully initialized ${initialized.length}/${records.length} drives`)
  return initialized
}

export async function joinDrive(name: string, publicKeyHex: string): Promise<InitializedDrive> {
  const id = randomUUID()
  const storageDir = resolveStorageDir(id)
  const corestore = new Corestore(storageDir)
  const hyperdrive = new Hyperdrive(corestore, Buffer.from(publicKeyHex, 'hex'))
  await hyperdrive.ready()

  await setupDriveReplication(id, hyperdrive)
  await startDriveWatcher(id, hyperdrive)

  const record: DriveRecord = {
    id,
    name,
    storageDir,
    publicKeyHex,
    contentKeyHex: hyperdrive.contentKey?.toString('hex'),
    createdAt: new Date().toISOString(),
    type: 'readonly',
    ownerKey: publicKeyHex
  }

  await addOrUpdateDrive(record)
  const initialized: InitializedDrive = { record, corestore, hyperdrive, isSyncing: false }
  activeDrives.set(id, initialized)
  return initialized
}

export function getActiveDrive(id: string): InitializedDrive | undefined {
  return activeDrives.get(id)
}

export function listActiveDrives(): InitializedDrive[] {
  return Array.from(activeDrives.values())
}

export async function checkDriveSyncStatus(driveId: string): Promise<{ isSyncing: boolean; version: number; peers: number; isFindingPeers: boolean; isDownloading: boolean }> {
  const drive = activeDrives.get(driveId)
  if (!drive) throw new Error('Drive not found')
  
  try {
    const hyperdrive = drive.hyperdrive
    const isOwned = drive.record.type === 'owned'
    
    // For owned drives, we're always "synced" since we own the data
    if (isOwned) {
      const peers = hyperdrive.core.peers?.length || 0
      const currentVersion = hyperdrive.version
      
      // Update the sync status in our map
      if (activeDrives.has(driveId)) {
        const currentDrive = activeDrives.get(driveId)!
        currentDrive.isSyncing = false
        activeDrives.set(driveId, currentDrive)
      }
      
      return { isSyncing: false, version: currentVersion, peers, isFindingPeers: false, isDownloading: false }
    }
    
    // For joined drives, check sync status
    const isFindingPeers = hyperdrive.findingPeers ? true : false
    const currentVersion = hyperdrive.version
    const peers = hyperdrive.core.peers?.length || 0
    
    // Check if drive is actively downloading blobs by sampling a few files
    let isDownloading = false
    try {
      // Sample a few files from the root to check if they're downloaded
      const sampleFiles: string[] = []
      let fileCount = 0
      const maxSample = 5 // Sample up to 5 files
      
      for await (const entry of hyperdrive.list('/', { recursive: true })) {
        if (entry?.value?.blob && fileCount < maxSample) {
          sampleFiles.push(entry.key)
          fileCount++
        }
      }
      
      // Check if any of the sample files are not yet downloaded locally
      for (const filePath of sampleFiles) {
        const hasFile = await hyperdrive.has(filePath)
        if (!hasFile) {
          isDownloading = true
          break
        }
      }
    } catch (err) {
      console.warn(`[hyperdrive] Error checking blob download status for ${driveId}:`, err)
      // If we can't check, assume not downloading
      isDownloading = false
    }
    
    // A drive is considered "syncing" if:
    // 1. It has no peers (can't connect), OR
    // 2. It's finding peers, OR  
    // 3. It's actively downloading blobs
    const isSyncing = peers === 0 || isFindingPeers || isDownloading
    
    // Update the sync status in our map
    if (activeDrives.has(driveId)) {
      const currentDrive = activeDrives.get(driveId)!
      currentDrive.isSyncing = isSyncing
      activeDrives.set(driveId, currentDrive)
    }
    
    console.log(`[hyperdrive] Joined drive ${driveId}: syncing=${isSyncing}, version=${currentVersion}, peers=${peers}, findingPeers=${isFindingPeers}, downloading=${isDownloading}`)
    
    return { isSyncing, version: currentVersion, peers, isFindingPeers, isDownloading }
  } catch (err) {
    console.warn(`[hyperdrive] Failed to check sync status for ${driveId}:`, err)
    return { isSyncing: false, version: 0, peers: 0, isFindingPeers: false, isDownloading: false }
  }
}

export function getDriveSyncStatus(driveId: string): boolean {
  const drive = activeDrives.get(driveId)
  return drive?.isSyncing || false
}

// Helper function to trigger download of all blobs for a drive
export async function triggerDriveDownload(driveId: string): Promise<void> {
  const drive = activeDrives.get(driveId)?.hyperdrive
  if (!drive) throw new Error('Drive not found')
  
  try {
    console.log(`[hyperdrive] Triggering download for drive ${driveId}`)
    // Download all blobs for the root directory
    await drive.download('/', { recursive: true, wait: false })
    console.log(`[hyperdrive] Download started for drive ${driveId}`)
    // Don't wait for completion - let it download in background
  } catch (err) {
    console.warn(`[hyperdrive] Failed to trigger download for drive ${driveId}:`, err)
  }
}

// Helper function to check if a specific file is downloaded locally
export async function isFileDownloaded(driveId: string, filePath: string): Promise<boolean> {
  const drive = activeDrives.get(driveId)?.hyperdrive
  if (!drive) throw new Error('Drive not found')
  
  try {
    return await drive.has(filePath)
  } catch (err) {
    console.warn(`[hyperdrive] Failed to check if file is downloaded ${filePath}:`, err)
    return false
  }
}

export async function closeAllDrives(): Promise<void> {
  // Clean up all swarms first
  await destroyAllSwarms()
  
  const closers = Array.from(activeDrives.values()).map(async ({ corestore }) => {
    try {
      await corestore.close()
    } catch {}
  })
  await Promise.allSettled(closers)
  activeDrives.clear()
}

export async function listDrive(folderDriveId: string, folder: string, recursive = false): Promise<Array<{ key: string, value: any }>> {
  const drive = activeDrives.get(folderDriveId)?.hyperdrive
  if (!drive) return []
  const results: Array<{ key: string, value: any }> = []
  const pseudoFiles: Array<{ key: string, value: any }> = []
  const listFolder = folder || '/'
  // Ensure folder starts with '/'
  const prefix = listFolder.startsWith('/') ? listFolder : `/${listFolder}`
  
  // console.log(`[hyperdrive] listDrive driveId=${folderDriveId} prefix=${prefix} recursive=${recursive}`)
  for await (const file of drive.list('/', { recursive: true })) {
    const isFile = !!file?.value?.blob || !!file?.value?.linkname
    console.log(`[hyperdrive] Processing file: ${file.key}, isFile: ${isFile}`)
    
    // Check if this is a pseudo-folder marker for a chunked file FIRST
    if (file.key.endsWith('/.keep')) {
      try {
        const metadata = file.value?.metadata
        if (metadata) {
          const parsedMetadata = JSON.parse(metadata)
          console.log(`[hyperdrive] Found .keep file: ${file.key}, metadata:`, parsedMetadata)
          if (parsedMetadata.isPseudoFolder && parsedMetadata.originalFileName) {
            // Create a pseudo-file entry for the chunked file
            // The original path should be the actual file path, not the .chunks path
            const chunksPath = file.key.replace('/.keep', '')
            const originalPath = chunksPath.replace('.chunks', '')
            console.log(`[hyperdrive] Creating pseudo-file for: ${originalPath} (from chunks: ${chunksPath})`)
            
            // Check if the original path is under the requested prefix
            if (originalPath.startsWith(prefix)) {
              const pseudoFile = {
                key: originalPath,
                value: {
                  blob: { byteLength: parsedMetadata.totalSize },
                  metadata: JSON.stringify({
                    ...parsedMetadata,
                    is_chunked: true,
                    chunkFolder: chunksPath,
                    createdAt: parsedMetadata.createdAt,
                    modifiedAt: parsedMetadata.modifiedAt
                  })
                }
              }
              pseudoFiles.push(pseudoFile)
              console.log(`[hyperdrive] Added pseudo-file: ${originalPath}`)
            } else {
              console.log(`[hyperdrive] Pseudo-file ${originalPath} not under prefix ${prefix}`)
            }
            continue
          }
        }
      } catch (e) {
        console.log(`[hyperdrive] Error parsing .keep metadata for ${file.key}:`, e)
        // Not a pseudo-folder, continue with normal processing
      }
    }
    
    // Skip .chunks folders and their contents (but not .keep files)
    if (file.key.includes('.chunks/') || (file.key.endsWith('.chunks') && !file.key.endsWith('/.keep'))) {
      console.log(`[hyperdrive] Skipping .chunks file: ${file.key}`)
      continue
    }
    
    // Only include items under prefix
    if (file.key.startsWith(prefix)) {
      results.push({ key: file.key, value: file.value })
    }
  }
  
  // Add pseudo-files to results
  results.push(...pseudoFiles)
  
  console.log(`[hyperdrive] listDrive done: ${results.length} entries (${pseudoFiles.length} pseudo-files)`)
  if (pseudoFiles.length > 0) {
    console.log(`[hyperdrive] Pseudo-files created:`, pseudoFiles.map(pf => pf.key))
  }
  return results
}

export async function createFolder(driveId: string, folderPath: string): Promise<void> {
  const drive = activeDrives.get(driveId)?.hyperdrive
  if (!drive) throw new Error('Drive not found')
  const base = folderPath.startsWith('/') ? folderPath : `/${folderPath}`
  // Create a directory marker file so the folder appears even when empty
  const markerPath = `${base.replace(/\/$/, '')}/.keep`
  
  // Store creation time in metadata
  const now = new Date().toISOString()
  const metadata = JSON.stringify({ createdAt: now, modifiedAt: now })
  
  await drive.put(markerPath, Buffer.alloc(0), { metadata })
  try { await (drive as any).update({ wait: false }) } catch {}
  broadcastDriveChanged(driveId)
}

// Helper function to force garbage collection asynchronously
function forceGarbageCollection(): void {
  if (global.gc) {
    // Use setImmediate to make GC non-blocking
    setImmediate(() => {
      global.gc()
      console.log(`[hyperdrive] Forced garbage collection`)
    })
  } else {
    console.log(`[hyperdrive] Garbage collection not available (run with --expose-gc)`)
  }
}

// Helper function to get memory usage info
function getMemoryUsage(): { used: number; total: number; percentage: number } {
  const usage = process.memoryUsage()
  const used = usage.heapUsed
  const total = usage.heapTotal
  const percentage = Math.round((used / total) * 100)
  return { used, total, percentage }
}

// Helper function to log memory usage
function logMemoryUsage(context: string): void {
  const mem = getMemoryUsage()
  console.log(`[hyperdrive] Memory usage ${context}: ${Math.round(mem.used / 1024 / 1024)}MB / ${Math.round(mem.total / 1024 / 1024)}MB (${mem.percentage}%)`)
}

export async function uploadFiles(
  driveId: string,
  folderPath: string,
  files: Array<{ name: string; data: Buffer }>
): Promise<{ uploaded: number }> {
  const drive = activeDrives.get(driveId)?.hyperdrive
  if (!drive) throw new Error('Drive not found')
  const base = (folderPath && folderPath !== '/') ? (folderPath.startsWith('/') ? folderPath : `/${folderPath}`) : '/'
  let uploaded = 0
  const now = new Date().toISOString()
  
  logMemoryUsage('before upload start')
  console.log(`[hyperdrive] Starting sequential upload of ${files.length} files`)
  
  // Process files one by one to avoid memory issues
  for (let i = 0; i < files.length; i++) {
    const f = files[i]
    const normalized = base === '/' ? `/${f.name}` : `${base.replace(/\/$/, '')}/${f.name}`
    const fileSize = f.data?.byteLength ?? f.data?.length ?? 0
    
    console.log(`[hyperdrive] Uploading file ${i + 1}/${files.length}: ${normalized} (${fileSize} bytes)`)
    logMemoryUsage(`before file ${i + 1} upload`)
    
    const metadata = JSON.stringify({ createdAt: now, modifiedAt: now })
    
    try {
      await drive.put(normalized, f.data, { metadata })
      uploaded += 1
      console.log(`[hyperdrive] Successfully uploaded: ${normalized}`)
      
      // Only force GC for large files or every 5 files to reduce freezing
      const LARGE_FILE_THRESHOLD = 5 * 1024 * 1024 // 5MB
      if (fileSize >= LARGE_FILE_THRESHOLD || (i + 1) % 5 === 0) {
        forceGarbageCollection()
      }
      logMemoryUsage(`after file ${i + 1} upload`)
      
    } catch (err) {
      console.error(`[hyperdrive] Failed to upload file ${normalized}:`, err)
      // Continue with other files even if one fails
    }
  }
  
  logMemoryUsage('after upload complete')
  console.log(`[hyperdrive] Upload complete: ${uploaded}/${files.length} files uploaded`)
  
  // Final garbage collection after all uploads
  forceGarbageCollection()
  
  try {
    // Hint replication layer we expect updates soon
    // @ts-ignore - update exists at runtime
    await (drive as any).update({ wait: false })
  } catch {}
  broadcastDriveChanged(driveId)
  return { uploaded }
}

// Streaming upload for large files with chunking
export async function uploadFileStream(
  driveId: string,
  folderPath: string,
  fileName: string,
  fileData: Uint8Array
): Promise<{ success: boolean; error?: string }> {
  const drive = activeDrives.get(driveId)?.hyperdrive
  if (!drive) throw new Error('Drive not found')
  
  const base = (folderPath && folderPath !== '/') ? (folderPath.startsWith('/') ? folderPath : `/${folderPath}`) : '/'
  const normalized = base === '/' ? `/${fileName}` : `${base.replace(/\/$/, '')}/${fileName}`
  const now = new Date().toISOString()
  const metadata = JSON.stringify({ createdAt: now, modifiedAt: now })
  
  try {
    console.log(`[hyperdrive] Starting chunked upload: ${normalized} (${fileData.length} bytes)`)
    logMemoryUsage('before chunked upload')
    
    // Hypercore has a maximum block size limit (typically 15MB)
    // We need to chunk large files to stay under this limit
    const MAX_BLOCK_SIZE = 10 * 1024 * 1024 // 10MB chunks to be safe
    const totalSize = fileData.length
    const numChunks = Math.ceil(totalSize / MAX_BLOCK_SIZE)
    
    console.log(`[hyperdrive] File will be split into ${numChunks} chunks of max ${MAX_BLOCK_SIZE} bytes each`)
    
    // Create a pseudo-folder for the chunked file
    const pseudoFolderPath = `${normalized}.chunks`
    const folderMetadata = JSON.stringify({ 
      createdAt: now, 
      modifiedAt: now,
      isPseudoFolder: true,
      originalFileName: fileName,
      totalSize,
      numChunks
    })
    
    // Create the pseudo-folder marker
    await drive.put(`${pseudoFolderPath}/.keep`, Buffer.alloc(0), { metadata: folderMetadata })
    
    // Upload file in chunks within the pseudo-folder
    for (let i = 0; i < numChunks; i++) {
      const start = i * MAX_BLOCK_SIZE
      const end = Math.min(start + MAX_BLOCK_SIZE, totalSize)
      const chunk = fileData.slice(start, end)
      const chunkPath = `${pseudoFolderPath}/chunk.${i.toString().padStart(3, '0')}`
      
      console.log(`[hyperdrive] Uploading chunk ${i + 1}/${numChunks}: ${chunkPath} (${chunk.length} bytes)`)
      
      await drive.put(chunkPath, Buffer.from(chunk), { metadata })
      
      // Force GC after each chunk to manage memory
      if (i % 5 === 0 || i === numChunks - 1) {
        forceGarbageCollection()
      }
    }
    
    // Create a manifest file within the pseudo-folder
    const manifest = {
      fileName,
      totalSize,
      numChunks,
      chunks: Array.from({ length: numChunks }, (_, i) => `chunk.${i.toString().padStart(3, '0')}`),
      createdAt: now,
      modifiedAt: now,
      isChunkedFile: true
    }
    
    const manifestPath = `${pseudoFolderPath}/manifest.json`
    await drive.put(manifestPath, Buffer.from(JSON.stringify(manifest, null, 2)), { metadata })
    
    console.log(`[hyperdrive] Successfully uploaded chunked file: ${normalized} (${numChunks} chunks)`)
    logMemoryUsage('after chunked upload')
    
    // Force garbage collection after large file upload
    forceGarbageCollection()
    
    try {
      // Hint replication layer we expect updates soon
      // @ts-ignore - update exists at runtime
      await (drive as any).update({ wait: false })
    } catch {}
    
    broadcastDriveChanged(driveId)
    return { success: true }
    
  } catch (err) {
    console.error(`[hyperdrive] Failed to upload file (chunked) ${normalized}:`, err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function uploadFolder(
  driveId: string,
  folderPath: string,
  files: Array<{ name: string; data: Buffer; relativePath: string }>
): Promise<{ uploaded: number }> {
  const drive = activeDrives.get(driveId)?.hyperdrive
  if (!drive) throw new Error('Drive not found')
  const base = (folderPath && folderPath !== '/') ? (folderPath.startsWith('/') ? folderPath : `/${folderPath}`) : '/'
  let uploaded = 0
  
  logMemoryUsage('before folder upload start')
  console.log(`[hyperdrive] Starting sequential folder upload of ${files.length} files`)
  
  // Create the main folder first
  const mainFolderPath = base.replace(/\/$/, '') + '/.keep'
  const now = new Date().toISOString()
  const metadata = JSON.stringify({ createdAt: now, modifiedAt: now })
  await drive.put(mainFolderPath, Buffer.alloc(0), { metadata })
  
  // Collect all unique directory paths that need to be created
  const directoryPaths = new Set<string>()
  for (const f of files) {
    const normalized = base === '/' ? `/${f.relativePath}` : `${base.replace(/\/$/, '')}/${f.relativePath}`
    const pathParts = normalized.split('/').filter(Boolean)
    
    // Add all intermediate directory paths
    for (let i = 1; i < pathParts.length; i++) {
      const dirPath = '/' + pathParts.slice(0, i).join('/')
      directoryPaths.add(dirPath)
    }
  }
  
  // Create all necessary directories
  for (const dirPath of directoryPaths) {
    const dirMarkerPath = dirPath + '/.keep'
    await drive.put(dirMarkerPath, Buffer.alloc(0), { metadata })
  }
  
  // Process files one by one to avoid memory issues
  for (let i = 0; i < files.length; i++) {
    const f = files[i]
    const normalized = base === '/' ? `/${f.relativePath}` : `${base.replace(/\/$/, '')}/${f.relativePath}`
    const fileSize = f.data?.byteLength ?? f.data?.length ?? 0
    
    console.log(`[hyperdrive] Uploading folder file ${i + 1}/${files.length}: ${normalized} (${fileSize} bytes)`)
    logMemoryUsage(`before folder file ${i + 1} upload`)
    
    const fileMetadata = JSON.stringify({ createdAt: now, modifiedAt: now })
    
    try {
      await drive.put(normalized, f.data, { metadata: fileMetadata })
      uploaded += 1
      console.log(`[hyperdrive] Successfully uploaded folder file: ${normalized}`)
      
      // Only force GC for large files or every 5 files to reduce freezing
      const LARGE_FILE_THRESHOLD = 5 * 1024 * 1024 // 5MB
      if (fileSize >= LARGE_FILE_THRESHOLD || (i + 1) % 5 === 0) {
        forceGarbageCollection()
      }
      logMemoryUsage(`after folder file ${i + 1} upload`)
      
    } catch (err) {
      console.error(`[hyperdrive] Failed to upload folder file ${normalized}:`, err)
      // Continue with other files even if one fails
    }
  }
  
  logMemoryUsage('after folder upload complete')
  console.log(`[hyperdrive] Folder upload complete: ${uploaded}/${files.length} files uploaded`)
  
  // Final garbage collection after all uploads
  forceGarbageCollection()
  
  try {
    // Hint replication layer we expect updates soon
    // @ts-ignore - update exists at runtime
    await (drive as any).update({ wait: false })
  } catch {}
  broadcastDriveChanged(driveId)
  return { uploaded }
}

// Simple file buffer function using proper Hyperdrive API
export async function downloadFile(driveId: string, path: string): Promise<boolean> {
  const drive = activeDrives.get(driveId)?.hyperdrive
  if (!drive) throw new Error('Drive not found')
  const normalized = path.startsWith('/') ? path : `/${path}`
  
  try {
    // Check if file exists
    const exists = await drive.exists(normalized)
    if (!exists) {
      console.log(`[hyperdrive] File does not exist: ${normalized}`)
      return false
    }

    // Check if file is already downloaded
    const isDownloaded = await drive.has(normalized)
    if (isDownloaded) {
      console.log(`[hyperdrive] File already downloaded: ${normalized}`)
      return true
    }

    // Start background download (non-blocking)
    console.log(`[hyperdrive] Starting background download: ${normalized}`)
    const download = await drive.download(normalized, { wait: false })
    console.log(`[hyperdrive] Background download started for: ${normalized}`)
    return true
  } catch (err) {
    console.error(`[hyperdrive] Failed to start download for ${normalized}:`, err)
    return false
  }
}

// Get file data, handling both regular files and chunked files
export async function getFileData(driveId: string, path: string): Promise<Buffer | null> {
  const drive = activeDrives.get(driveId)?.hyperdrive
  if (!drive) throw new Error('Drive not found')
  const normalized = path.startsWith('/') ? path : `/${path}`
  
  try {
    // First check if it's a regular file
    const exists = await drive.exists(normalized)
    if (exists) {
      const data = await drive.get(normalized)
      if (data) {
        return data
      }
    }
    
    // Check if it's a pseudo-file with chunked metadata
    // We need to check the file listing to see if this is a pseudo-file
    const entries = await listDrive(driveId, '/', true)
    const pseudoFile = entries.find(entry => entry.key === normalized)
    
    if (pseudoFile?.value?.metadata) {
      try {
        const metadata = JSON.parse(pseudoFile.value.metadata)
        if (metadata.is_chunked && metadata.chunkFolder) {
          console.log(`[hyperdrive] Detected pseudo-file with chunked data: ${normalized}`)
          return await getChunkedFileData(drive, metadata.chunkFolder, metadata.numChunks)
        }
      } catch (e) {
        // Not a pseudo-file, continue with normal processing
      }
    }
    
    // Legacy check: look for pseudo-folder (for backward compatibility)
    const pseudoFolderPath = `${normalized}.chunks`
    const manifestPath = `${pseudoFolderPath}/manifest.json`
    const manifestExists = await drive.exists(manifestPath)
    
    if (manifestExists) {
      console.log(`[hyperdrive] Detected legacy chunked file: ${normalized}`)
      const manifestData = await drive.get(manifestPath)
      if (!manifestData) {
        console.error(`[hyperdrive] Failed to read manifest for ${normalized}`)
        return null
      }
      
      const manifest = JSON.parse(manifestData.toString())
      return await getChunkedFileData(drive, pseudoFolderPath, manifest.numChunks)
    }
    
    console.log(`[hyperdrive] File not found: ${normalized}`)
    return null
    
  } catch (err) {
    console.error(`[hyperdrive] Failed to get file data for ${normalized}:`, err)
    return null
  }
}

// Helper function to get chunked file data
async function getChunkedFileData(drive: any, chunkFolder: string, numChunks: number): Promise<Buffer | null> {
  try {
    console.log(`[hyperdrive] Reassembling ${numChunks} chunks from ${chunkFolder}`)
    
    // Download all chunks from chunk folder
    const chunks: Buffer[] = []
    for (let i = 0; i < numChunks; i++) {
      const chunkPath = `${chunkFolder}/chunk.${i.toString().padStart(3, '0')}`
      const chunkData = await drive.get(chunkPath)
      if (!chunkData) {
        console.error(`[hyperdrive] Failed to read chunk ${i} from ${chunkPath}`)
        return null
      }
      chunks.push(chunkData)
    }
    
    // Combine chunks
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
    const combined = Buffer.alloc(totalSize)
    let offset = 0
    for (const chunk of chunks) {
      chunk.copy(combined, offset)
      offset += chunk.length
    }
    
    console.log(`[hyperdrive] Successfully reassembled chunked file: ${totalSize} bytes`)
    return combined
    
  } catch (err) {
    console.error(`[hyperdrive] Failed to reassemble chunked file:`, err)
    return null
  }
}

export async function getFileBuffer(driveId: string, path: string): Promise<Buffer | null> {
  const drive = activeDrives.get(driveId)?.hyperdrive
  if (!drive) throw new Error('Drive not found')
  const normalized = path.startsWith('/') ? path : `/${path}`
  
  // If it's a folder marker, ignore
  if (normalized.endsWith('/.keep')) return null

  try {
    // Use getFileData which handles both regular and chunked files
    console.log(`[hyperdrive] Reading file: ${normalized}`)
    const data = await getFileData(driveId, normalized)
    
    if (!data) {
      console.log(`[hyperdrive] File not found or empty: ${normalized}`)
      return null
    }

    console.log(`[hyperdrive] Successfully read file: ${normalized}, bytes=${data.length}`)
    return data
  } catch (err) {
    console.error(`[hyperdrive] Failed to read file ${normalized}:`, err)
    return null
  }
}

// Helper function to check if a path is a folder
async function isFolder(drive: any, path: string): Promise<boolean> {
  try {
    // Check if the path exists as a direct entry
    const exists = await drive.exists(path)
    if (!exists) {
      // If path doesn't exist directly, check if it's a folder by looking for contents
      const prefix = path.endsWith('/') ? path : `${path}/`
      let hasContents = false
      for await (const entry of drive.list('/', { recursive: true })) {
        if (entry.key.startsWith(prefix)) {
          hasContents = true
          break
        }
      }
      return hasContents
    }
    
    // If it exists, check if it's a file or folder
    const entry = await drive.entry(path)
    const isFile = !!entry?.value?.blob || !!entry?.value?.linkname
    return !isFile
  } catch (err) {
    console.warn(`[hyperdrive] isFolder check failed for ${path}:`, err)
    return false
  }
}

// Helper function to delete all contents of a folder recursively
async function deleteFolderContents(drive: any, folderPath: string): Promise<void> {
  const prefix = folderPath.endsWith('/') ? folderPath : `${folderPath}/`
  const entriesToDelete: any[] = []
  
  // Collect all entries under this folder with their blob references
  for await (const entry of drive.list('/', { recursive: true })) {
    if (entry.key.startsWith(prefix)) {
      entriesToDelete.push(entry)
    }
  }
  
  // Delete all entries (files and subfolders) with proper blob clearing
  for (const entry of entriesToDelete) {
    try {
      const entryPath = entry.key
      const blobRef = entry.value?.blob
      
      console.log(`[hyperdrive] deleteFolderContents: deleting ${entryPath}, hasBlob=${!!blobRef}`)
      
      // Remove file entry from drive structure
      await drive.del(entryPath)
      console.log(`[hyperdrive] deleteFolderContents: del() completed for ${entryPath}`)
      
      // Free blob storage to reclaim disk space if it's a file with blob data
      if (blobRef) {
        try {
          const blobs = await drive.getBlobs()
          const cleared = await blobs.clear(blobRef, { diff: true })
          console.log(`[hyperdrive] deleteFolderContents: blobs.clear() completed for ${entryPath}, cleared bytes:`, cleared)
        } catch (err) {
          console.warn(`[hyperdrive] deleteFolderContents: blobs.clear failed for ${entryPath}, falling back to drive.clear`, err)
          // Fallback to path-based clear
          const cleared = await drive.clear(entryPath, { diff: true })
          console.log(`[hyperdrive] deleteFolderContents: drive.clear() completed for ${entryPath}, cleared bytes:`, cleared)
        }
      }
      
      console.log(`[hyperdrive] deleteFolderContents: successfully deleted ${entryPath}`)
    } catch (err) {
      console.warn(`[hyperdrive] deleteFolderContents: failed to delete ${entry.key}:`, err)
    }
  }
}

export async function deleteFile(driveId: string, path: string): Promise<boolean> {
  const drive = activeDrives.get(driveId)?.hyperdrive
  if (!drive) throw new Error('Drive not found')
  const normalized = path.startsWith('/') ? path : `/${path}`
  
  try {
    // First check if this is a pseudo-file (chunked file)
    const entries = await listDrive(driveId, '/', true)
    const pseudoFile = entries.find(entry => entry.key === normalized)
    
    if (pseudoFile?.value?.metadata) {
      try {
        const metadata = JSON.parse(pseudoFile.value.metadata)
        if (metadata.is_chunked && metadata.chunkFolder) {
          console.log(`[hyperdrive] deleteFile ${normalized}: deleting pseudo-file, targeting chunks folder: ${metadata.chunkFolder}`)
          // Delete the entire .chunks folder
          await deleteFolderContents(drive, metadata.chunkFolder)
          console.log(`[hyperdrive] deleteFile ${normalized}: successfully deleted chunked file`)
          return true
        }
      } catch (e) {
        // Not a pseudo-file, continue with normal processing
      }
    }
    
    // Check if it's a folder or file
    const isFolderPath = await isFolder(drive, normalized)
    console.log(`[hyperdrive] deleteFile ${normalized}: isFolder=${isFolderPath}`)
    
    if (isFolderPath) {
      // Handle folder deletion
      console.log(`[hyperdrive] deleteFile ${normalized}: deleting folder and all contents`)
      await deleteFolderContents(drive, normalized)
    } else {
      // Handle file deletion (original logic)
      const existsBefore = await drive.exists(normalized)
      console.log(`[hyperdrive] deleteFile ${normalized}: exists before=${existsBefore}`)
      
      if (!existsBefore) {
        console.log(`[hyperdrive] deleteFile ${normalized}: file does not exist, nothing to delete`)
        return true
      }
    
      // Read entry BEFORE deletion so we can get the blob reference to clear
      const entryBefore = await drive.entry(normalized)
      const blobRef = entryBefore?.value?.blob
      console.log(`[hyperdrive] deleteFile ${normalized}: entry blob before del=`, blobRef)

      // Capture storage info before for diagnostics
      let blobsLengthBefore: number | undefined
      try {
        blobsLengthBefore = await drive.getBlobsLength()
      } catch {}

      // Remove file entry from drive structure
      await drive.del(normalized)
      console.log(`[hyperdrive] deleteFile ${normalized}: del() completed`)
      
      // Free blob storage to reclaim disk space using explicit blob reference if available
      let cleared: any = null
      if (blobRef) {
        try {
          const blobs = await drive.getBlobs()
          cleared = await blobs.clear(blobRef, { diff: true })
          console.log(`[hyperdrive] deleteFile ${normalized}: blobs.clear() completed, cleared bytes:`, cleared)
        } catch (err) {
          console.warn(`[hyperdrive] deleteFile ${normalized}: blobs.clear failed, falling back to drive.clear`, err)
          // Fallback to path-based clear
          cleared = await drive.clear(normalized, { diff: true })
          console.log(`[hyperdrive] deleteFile ${normalized}: drive.clear() completed, cleared bytes:`, cleared)
        }
      } else {
        // No blobRef (e.g., symlink) - attempt path-based clear anyway
        cleared = await drive.clear(normalized, { diff: true })
        console.log(`[hyperdrive] deleteFile ${normalized}: drive.clear() (no blobRef) completed, cleared bytes:`, cleared)
      }
    }
    
    // Verify deletion
    const existsAfter = await drive.exists(normalized)
    console.log(`[hyperdrive] deleteFile ${normalized}: exists after=${existsAfter}`)
    
    // For folders, also check if any contents remain
    if (isFolderPath) {
      const prefix = normalized.endsWith('/') ? normalized : `${normalized}/`
      let hasRemainingContents = false
      for await (const entry of drive.list('/', { recursive: true })) {
        if (entry.key.startsWith(prefix)) {
          hasRemainingContents = true
          break
        }
      }
      console.log(`[hyperdrive] deleteFile ${normalized}: folder has remaining contents=${hasRemainingContents}`)
    }

    console.log(`[hyperdrive] deleteFile ${normalized}: deleted successfully`)
    try { await drive.update({ wait: false }) } catch {}
    broadcastDriveChanged(driveId)
    return true
  } catch (err) {
    console.error(`[hyperdrive] deleteFile ${normalized}: failed`, err)
    return false
  }
}

export async function getDriveStorageInfo(driveId: string): Promise<{ blobsLength: number, version: number }> {
  const drive = activeDrives.get(driveId)?.hyperdrive
  if (!drive) throw new Error('Drive not found')
  
  try {
    // @ts-ignore - hyperdrive getBlobsLength method exists at runtime
    const blobsLength = await (drive as any).getBlobsLength()
    const version = drive.version
    
    console.log(`[hyperdrive] getDriveStorageInfo ${driveId}: blobsLength=${blobsLength}, version=${version}`)
    return { blobsLength, version }
  } catch (err) {
    console.error(`[hyperdrive] getDriveStorageInfo ${driveId}: failed`, err)
    throw err
  }
}

export async function getFolderStats(driveId: string, folder: string): Promise<{ files: number; folders: number; sizeBytes: number }> {
  const drive = activeDrives.get(driveId)?.hyperdrive
  if (!drive) throw new Error('Drive not found')
  const prefix = (folder && folder !== '/') ? (folder.startsWith('/') ? folder : `/${folder}`) : '/'
  let files = 0
  let folders = 0
  let sizeBytes = 0
  
  // Track unique folder paths to avoid double counting
  const folderPaths = new Set<string>()
  
  try {
    for await (const entry of (drive as any).list('/', { recursive: true })) {
      if (!entry?.key || !entry.key.startsWith(prefix)) continue
      
      // Skip .keep files
      if (entry.key.endsWith('/.keep')) continue
      
      const isFile = !!entry?.value?.blob || !!entry?.value?.linkname
      
      if (isFile) {
        files += 1
        // Try best: read entry blob length; if missing, stream bytes
        const reported = Number(entry?.value?.blob?.byteLength || entry?.value?.blob?.length || 0)
        if (reported > 0) {
          sizeBytes += reported
        } else {
          try {
            const normalized = entry.key
            const readStream = (drive as any).createReadStream(normalized)
            let fileBytes = 0
            for await (const chunk of readStream) {
              fileBytes += Buffer.isBuffer(chunk) ? (chunk as Buffer).length : Buffer.byteLength(chunk)
            }
            sizeBytes += fileBytes
          } catch {}
        }
      } else {
        // This is a folder - count it only once
        const folderPath = entry.key
        if (!folderPaths.has(folderPath)) {
          folderPaths.add(folderPath)
          folders += 1
        }
      }
    }
  } catch (err) {
    console.warn(`[hyperdrive] getFolderStats failed for ${driveId} ${prefix}`, err)
  }
  return { files, folders, sizeBytes }
}

export async function getFileStats(driveId: string, path: string): Promise<{ createdAt?: string; modifiedAt?: string; size?: number }> {
  const drive = activeDrives.get(driveId)?.hyperdrive
  if (!drive) throw new Error('Drive not found')
  
  const normalized = path.startsWith('/') ? path : `/${path}`
  
  try {
    // First check if this is a pseudo-file (chunked file)
    const entries = await listDrive(driveId, '/', true)
    const pseudoFile = entries.find(entry => entry.key === normalized)
    
    if (pseudoFile?.value?.metadata) {
      try {
        const metadata = JSON.parse(pseudoFile.value.metadata)
        if (metadata.is_chunked) {
          console.log(`[hyperdrive] getFileStats: Found pseudo-file ${normalized}`)
          return {
            size: metadata.totalSize || 0,
            createdAt: metadata.createdAt,
            modifiedAt: metadata.modifiedAt
          }
        }
      } catch (e) {
        // Not a pseudo-file, continue with normal processing
      }
    }
    
    // Get file entry using hyperdrive's entry method
    const entry = await drive.entry(normalized)
    
    if (!entry) {
      console.log(`[hyperdrive] getFileStats: No entry found for ${normalized}`)
      return {}
    }
    
    // Extract size from blob metadata
    let size = 0
    if (entry.value?.blob) {
      size = entry.value.blob.byteLength || 0
    }
    
    // Check if metadata contains timestamps
    let createdAt: string | undefined
    let modifiedAt: string | undefined
    
    
    if (entry.value?.metadata) {
      try {
        const metadata = typeof entry.value.metadata === 'string' 
          ? JSON.parse(entry.value.metadata) 
          : entry.value.metadata
        createdAt = metadata?.createdAt
        modifiedAt = metadata?.modifiedAt
      } catch (err) {
        console.warn(`[hyperdrive] Failed to parse metadata for ${normalized}:`, err)
      }
    } else {
      console.log(`[hyperdrive] getFileStats: No metadata found for ${normalized}`)
    }
    
    // Always provide timestamps - use metadata if available, otherwise use current time
    if (!createdAt) {
      console.log(`[hyperdrive] getFileStats: Using fallback creation time for ${normalized}`)
      createdAt = new Date().toISOString()
    }
    if (!modifiedAt) {
      modifiedAt = new Date().toISOString()
    }
    
    // Ensure we always return valid timestamps
    createdAt = createdAt || new Date().toISOString()
    modifiedAt = modifiedAt || new Date().toISOString()
    
    console.log(`[hyperdrive] getFileStats parsed:`, { createdAt, modifiedAt, size })
    return { createdAt, modifiedAt, size }
  } catch (err) {
    console.warn(`[hyperdrive] getFileStats failed for ${driveId} ${normalized}`, err)
    return {}
  }
}

import { writeFile, mkdir } from 'fs/promises'
import { homedir } from 'os'
import { getDownloadConfig, DownloadConfig } from '../config/downloadConfig'

// Single file download using proper Hyperdrive API
export async function downloadFileToDownloads(driveId: string, filePath: string, fileName: string, driveName: string, onProgress?: (currentFile: string, downloadedFiles: number, totalFiles: number) => void): Promise<{ success: boolean; downloadPath: string }> {
  const drive = activeDrives.get(driveId)?.hyperdrive
  if (!drive) throw new Error('Drive not found')
  
  const config = getDownloadConfig()
  const downloadsDir = join(homedir(), 'Downloads', 'HyperTeleporter', driveName)
  const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`
  
  try {
    await mkdir(downloadsDir, { recursive: true })

    console.log(`[hyperdrive] Downloading file: ${normalizedPath}`)
    
    // Create directory structure
    const pathParts = filePath.split('/').filter(Boolean)
    const dirPath = pathParts.slice(0, -1).join('/')
    const finalDir = dirPath ? join(downloadsDir, dirPath) : downloadsDir

    if (dirPath) {
      await mkdir(finalDir, { recursive: true })
    }

    const targetPath = join(finalDir, fileName)
    
    // Check if it's a pseudo-file with chunked metadata FIRST
    const entries = await listDrive(driveId, '/', true)
    const pseudoFile = entries.find(entry => entry.key === normalizedPath)
    
    let isChunkedFile = false
    let chunkFolder = null
    
    if (pseudoFile?.value?.metadata) {
      try {
        const metadata = JSON.parse(pseudoFile.value.metadata)
        if (metadata.is_chunked && metadata.chunkFolder) {
          isChunkedFile = true
          chunkFolder = metadata.chunkFolder
          console.log(`[hyperdrive] Detected pseudo-file for chunked download: ${normalizedPath} -> ${chunkFolder}`)
        }
      } catch (e) {
        // Not a pseudo-file, continue with normal processing
      }
    }
    
    // Legacy check: look for pseudo-folder
    if (!isChunkedFile) {
      const pseudoFolderPath = `${normalizedPath}.chunks`
      const manifestPath = `${pseudoFolderPath}/manifest.json`
      const manifestExists = await drive.exists(manifestPath)
      
      if (manifestExists) {
        isChunkedFile = true
        chunkFolder = pseudoFolderPath
        console.log(`[hyperdrive] Detected legacy pseudo-folder for chunked download: ${normalizedPath} -> ${chunkFolder}`)
      }
    }
    
    if (isChunkedFile) {
      console.log(`[hyperdrive] Downloading chunked file: ${fileName}`)
      await downloadChunkedFileToDownloads(drive, chunkFolder, targetPath, config, onProgress)
    } else {
      // For regular files, check if they exist
      const exists = await drive.exists(normalizedPath)
      if (!exists) {
        throw new Error('File does not exist')
      }
      // Try streaming first for better performance and memory efficiency
      try {
        const stream = drive.createReadStream(normalizedPath, { wait: true, timeout: config.streamTimeout })
        const writeStream = require('fs').createWriteStream(targetPath)
        
        await new Promise((resolve, reject) => {
          stream.pipe(writeStream)
          writeStream.on('finish', resolve)
          writeStream.on('error', reject)
          stream.on('error', reject)
        })
        
        console.log(`[hyperdrive] Downloaded file (stream): ${fileName} to ${targetPath}`)
      } catch (streamError) {
        console.warn(`[hyperdrive] Streaming failed for ${normalizedPath}, falling back to buffer method:`, streamError)
        
        // Fallback to buffer method
        const data = await drive.get(normalizedPath, { wait: true, timeout: config.streamTimeout })
        
        if (!data) {
          throw new Error('File is empty or could not be read')
        }

        await writeFile(targetPath, data)
        console.log(`[hyperdrive] Downloaded file (buffer): ${fileName} to ${targetPath}`)
      }
    }

    console.log(`[hyperdrive] Downloaded file: ${fileName} to ${targetPath}`)
    return { success: true, downloadPath: targetPath }
  } catch (err) {
    console.error(`[hyperdrive] downloadFileToDownloads failed for ${driveId} ${filePath}:`, err)
    throw err
  }
}

// Download chunked file by reassembling chunks
async function downloadChunkedFileToDownloads(
  drive: any, 
  pseudoFolderPath: string, 
  targetPath: string, 
  config: any,
  onProgress?: (currentFile: string, downloadedFiles: number, totalFiles: number) => void
): Promise<void> {
  try {
    // Read manifest
    const manifestData = await drive.get(`${pseudoFolderPath}/manifest.json`)
    if (!manifestData) {
      throw new Error('Manifest not found for chunked file')
    }
    
    const manifest = JSON.parse(manifestData.toString())
    console.log(`[hyperdrive] Reassembling ${manifest.numChunks} chunks for ${manifest.fileName}`)
    
    // Create write stream for the target file
    const writeStream = require('fs').createWriteStream(targetPath)
    
    // Download and write chunks in order
    for (let i = 0; i < manifest.numChunks; i++) {
      const chunkPath = `${pseudoFolderPath}/chunk.${i.toString().padStart(3, '0')}`
      console.log(`[hyperdrive] Downloading chunk ${i + 1}/${manifest.numChunks}: ${chunkPath}`)
      
      // Report progress for each chunk
      if (onProgress) {
        onProgress(`chunk.${i.toString().padStart(3, '0')}`, i, manifest.numChunks)
      }
      
      const chunkData = await drive.get(chunkPath, { wait: true, timeout: config.streamTimeout })
      if (!chunkData) {
        throw new Error(`Failed to download chunk ${i}`)
      }
      
      // Write chunk to file
      writeStream.write(chunkData)
      
      // Force GC periodically to manage memory
      if (i % 10 === 0) {
        forceGarbageCollection()
      }
    }
    
    writeStream.end()
    
    // Wait for write stream to finish
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve)
      writeStream.on('error', reject)
    })
    
    console.log(`[hyperdrive] Successfully reassembled and downloaded chunked file: ${targetPath}`)
    
  } catch (err) {
    console.error(`[hyperdrive] Failed to download chunked file:`, err)
    throw err
  }
}

// Progress batching utility
class ProgressBatcher {
  private updates: Array<{ currentFile: string; downloadedFiles: number; totalFiles: number }> = []
  private batchTimeout: NodeJS.Timeout | null = null
  private onProgress: (currentFile: string, downloadedFiles: number, totalFiles: number) => void
  private batchInterval: number

  constructor(onProgress: (currentFile: string, downloadedFiles: number, totalFiles: number) => void, batchInterval = 100) {
    this.onProgress = onProgress
    this.batchInterval = batchInterval
  }

  addUpdate(update: { currentFile: string; downloadedFiles: number; totalFiles: number }) {
    this.updates.push(update)
    
    if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => {
        this.flushUpdates()
      }, this.batchInterval)
    }
  }

  private flushUpdates() {
    if (this.updates.length > 0) {
      // Send the latest update
      const latest = this.updates[this.updates.length - 1]
      this.onProgress(latest.currentFile, latest.downloadedFiles, latest.totalFiles)
      this.updates = []
    }
    this.batchTimeout = null
  }

  destroy() {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout)
      this.batchTimeout = null
    }
    this.flushUpdates()
  }
}

// Parallel download utility
async function downloadFileParallel(
  drive: Hyperdrive, 
  entry: { key: string; value: any }, 
  targetDir: string, 
  folderPath: string,
  progressBatcher: ProgressBatcher,
  totalFiles: number,
  config: DownloadConfig
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  try {
    console.log(`[hyperdrive] Downloading file: ${entry.key}`)
    
    // Check if this is a pseudo-file with chunked metadata
    if (entry.value?.metadata) {
      try {
        const metadata = JSON.parse(entry.value.metadata)
        if (metadata.is_chunked && metadata.chunkFolder) {
          console.log(`[hyperdrive] Detected pseudo-file for chunked file: ${entry.key}`)
          return await downloadPseudoFile(drive, entry.key, targetDir, folderPath, metadata, config, (currentFile, downloadedFiles, totalFiles) => {
            progressBatcher.addUpdate({
              currentFile,
              downloadedFiles,
              totalFiles
            })
          })
        }
      } catch (e) {
        // Not a pseudo-file, continue with normal processing
      }
    }
    
    // Legacy check: pseudo-folder (.keep file with chunked file metadata)
    if (entry.key.endsWith('/.keep')) {
      const metadata = entry.value?.metadata
      if (metadata) {
        try {
          const parsedMetadata = JSON.parse(metadata)
          if (parsedMetadata.isPseudoFolder && parsedMetadata.originalFileName) {
            console.log(`[hyperdrive] Detected legacy pseudo-folder for chunked file: ${parsedMetadata.originalFileName}`)
            return await downloadPseudoFolder(drive, entry.key, targetDir, folderPath, parsedMetadata, config)
          }
        } catch (e) {
          // Not a pseudo-folder, continue with normal processing
        }
      }
    }
    
    // Use streaming for better memory efficiency
    const relativePath = entry.key.startsWith(folderPath) 
      ? entry.key.slice(folderPath.length).replace(/^\//, '')
      : entry.key.replace(/^\//, '')
    
    const filePath = join(targetDir, relativePath)
    const fileDir = join(targetDir, relativePath.split('/').slice(0, -1).join('/'))
    
    if (fileDir !== targetDir) {
      await mkdir(fileDir, { recursive: true })
    }

    // Try streaming first for better performance if enabled
    if (config.enableStreaming) {
      try {
        const stream = drive.createReadStream(entry.key, { wait: true, timeout: config.streamTimeout })
        const writeStream = require('fs').createWriteStream(filePath)
        
        await new Promise((resolve, reject) => {
          stream.pipe(writeStream)
          writeStream.on('finish', resolve)
          writeStream.on('error', reject)
          stream.on('error', reject)
        })
        
        console.log(`[hyperdrive] Downloaded (stream): ${relativePath}`)
        return { success: true, filePath }
      } catch (streamError) {
        console.warn(`[hyperdrive] Streaming failed for ${entry.key}, falling back to buffer method:`, streamError)
      }
    }
    
    // Fallback to buffer method with retries
    let data: Buffer | null = null
    for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
      try {
        data = await drive.get(entry.key, { wait: true, timeout: config.streamTimeout })
        if (data && data.length > 0) break
      } catch (err) {
        console.warn(`[hyperdrive] get() attempt ${attempt} failed for ${entry.key}:`, err)
      }
      
      // On retry, try a blocking prefetch for this single file
      try {
        const blocking = await drive.download(entry.key, { wait: true })
        await blocking.done()
      } catch (e) {
        console.warn(`[hyperdrive] Blocking prefetch failed for ${entry.key}:`, e)
      }
      
      // Exponential backoff before next try
      if (attempt < config.maxRetries) {
        await new Promise(r => setTimeout(r, config.retryDelay * attempt))
      }
    }
    
    if (data && data.length > 0) {
      await writeFile(filePath, data)
      console.log(`[hyperdrive] Downloaded (buffer): ${relativePath}`)
      return { success: true, filePath }
    } else {
      return { success: false, error: 'No data after retries' }
    }
  } catch (err) {
    console.error(`[hyperdrive] Failed to download file ${entry.key}:`, err)
    return { success: false, error: String(err) }
  }
}

// Download pseudo-file by reassembling chunks
async function downloadPseudoFile(
  drive: Hyperdrive,
  pseudoFilePath: string,
  targetDir: string,
  folderPath: string,
  metadata: any,
  config: DownloadConfig,
  onProgress?: (currentFile: string, downloadedFiles: number, totalFiles: number) => void
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  try {
    const originalFileName = metadata.originalFileName
    const numChunks = metadata.numChunks
    const chunkFolder = metadata.chunkFolder
    
    console.log(`[hyperdrive] Reassembling ${numChunks} chunks for ${originalFileName}`)
    
    // Create relative path for the reassembled file
    const relativePath = pseudoFilePath.startsWith(folderPath) 
      ? pseudoFilePath.slice(folderPath.length).replace(/^\//, '')
      : pseudoFilePath.replace(/^\//, '')
    
    const filePath = join(targetDir, relativePath)
    const fileDir = join(targetDir, relativePath.split('/').slice(0, -1).join('/'))
    
    if (fileDir !== targetDir) {
      await mkdir(fileDir, { recursive: true })
    }
    
    // Create write stream for the reassembled file
    const writeStream = require('fs').createWriteStream(filePath)
    
    // Download and write chunks in order
    for (let i = 0; i < numChunks; i++) {
      const chunkPath = `${chunkFolder}/chunk.${i.toString().padStart(3, '0')}`
      console.log(`[hyperdrive] Downloading chunk ${i + 1}/${numChunks}: ${chunkPath}`)
      
      // Report progress for each chunk
      if (onProgress) {
        onProgress(`chunk.${i.toString().padStart(3, '0')}`, i, numChunks)
      }
      
      const chunkData = await drive.get(chunkPath, { wait: true, timeout: config.streamTimeout })
      if (!chunkData) {
        throw new Error(`Failed to download chunk ${i}`)
      }
      
      // Write chunk to file
      writeStream.write(chunkData)
      
      // Force GC periodically to manage memory
      if (i % 10 === 0) {
        forceGarbageCollection()
      }
    }
    
    writeStream.end()
    
    // Wait for write stream to finish
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve)
      writeStream.on('error', reject)
    })
    
    console.log(`[hyperdrive] Successfully reassembled chunked file: ${originalFileName}`)
    return { success: true, filePath }
    
  } catch (err) {
    console.error(`[hyperdrive] Failed to download pseudo-file:`, err)
    return { success: false, error: String(err) }
  }
}

// Download pseudo-folder by reassembling chunks (legacy)
async function downloadPseudoFolder(
  drive: Hyperdrive,
  pseudoFolderPath: string,
  targetDir: string,
  folderPath: string,
  metadata: any,
  config: DownloadConfig
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  try {
    const originalFileName = metadata.originalFileName
    const numChunks = metadata.numChunks
    
    console.log(`[hyperdrive] Reassembling ${numChunks} chunks for ${originalFileName}`)
    
    // Create relative path for the reassembled file
    const relativePath = pseudoFolderPath.startsWith(folderPath) 
      ? pseudoFolderPath.slice(folderPath.length).replace(/^\//, '').replace('.chunks', '')
      : pseudoFolderPath.replace(/^\//, '').replace('.chunks', '')
    
    const filePath = join(targetDir, relativePath)
    const fileDir = join(targetDir, relativePath.split('/').slice(0, -1).join('/'))
    
    if (fileDir !== targetDir) {
      await mkdir(fileDir, { recursive: true })
    }
    
    // Create write stream for the reassembled file
    const writeStream = require('fs').createWriteStream(filePath)
    
    // Download and write chunks in order
    for (let i = 0; i < numChunks; i++) {
      const chunkPath = `${pseudoFolderPath}/chunk.${i.toString().padStart(3, '0')}`
      console.log(`[hyperdrive] Downloading chunk ${i + 1}/${numChunks}: ${chunkPath}`)
      
      const chunkData = await drive.get(chunkPath, { wait: true, timeout: config.streamTimeout })
      if (!chunkData) {
        throw new Error(`Failed to download chunk ${i}`)
      }
      
      // Write chunk to file
      writeStream.write(chunkData)
      
      // Force GC periodically to manage memory
      if (i % 10 === 0) {
        forceGarbageCollection()
      }
    }
    
    writeStream.end()
    
    // Wait for write stream to finish
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve)
      writeStream.on('error', reject)
    })
    
    console.log(`[hyperdrive] Successfully reassembled chunked file: ${originalFileName}`)
    return { success: true, filePath }
    
  } catch (err) {
    console.error(`[hyperdrive] Failed to download pseudo-folder:`, err)
    return { success: false, error: String(err) }
  }
}

// Chunk array utility for batching
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize))
  }
  return chunks
}

// Smart prefetching system
class SmartPrefetcher {
  private drive: Hyperdrive
  private prefetchQueue: string[] = []
  private isPrefetching = false
  private prefetchPromises = new Map<string, Promise<any>>()
  private enabled: boolean
  private batchSize: number

  constructor(drive: Hyperdrive, enabled = true, batchSize = 3) {
    this.drive = drive
    this.enabled = enabled
    this.batchSize = batchSize
  }

  async prefetchFiles(files: Array<{ key: string; value: any }>, currentIndex: number, batchSize?: number) {
    if (!this.enabled) return
    
    const prefetchBatchSize = batchSize || this.batchSize
    const nextFiles = files.slice(currentIndex + 1, currentIndex + 1 + prefetchBatchSize)
    
    for (const file of nextFiles) {
      if (!this.prefetchPromises.has(file.key)) {
        const prefetchPromise = this.prefetchFile(file.key)
        this.prefetchPromises.set(file.key, prefetchPromise)
      }
    }
  }

  private async prefetchFile(filePath: string) {
    try {
      // Use non-blocking download for prefetching
      const download = await this.drive.download(filePath, { wait: false })
      console.log(`[SmartPrefetcher] Started prefetch for: ${filePath}`)
      return download
    } catch (err) {
      console.warn(`[SmartPrefetcher] Prefetch failed for ${filePath}:`, err)
      return null
    }
  }

  async waitForPrefetch(filePath: string) {
    const prefetchPromise = this.prefetchPromises.get(filePath)
    if (prefetchPromise) {
      try {
        const download = await prefetchPromise
        if (download) {
          await download.done()
          console.log(`[SmartPrefetcher] Prefetch completed for: ${filePath}`)
        }
      } catch (err) {
        console.warn(`[SmartPrefetcher] Prefetch wait failed for ${filePath}:`, err)
      }
    }
  }

  cleanup() {
    this.prefetchPromises.clear()
    this.prefetchQueue = []
  }
}

// Folder download using parallel processing and streaming
export async function downloadFolderToDownloads(driveId: string, folder: string, _folderName: string, driveName: string, onProgress?: (currentFile: string, downloadedFiles: number, totalFiles: number) => void): Promise<{ success: boolean; downloadPath: string; fileCount: number }> {
  const drive = activeDrives.get(driveId)?.hyperdrive
  if (!drive) throw new Error('Drive not found')

  const config = getDownloadConfig()
  const downloadsDir = join(homedir(), 'Downloads', 'HyperTeleporter', driveName)
  
  // Handle virtual-root and root folder cases
  let folderPath = folder
  if (folder === 'virtual-root' || folder === '/' || folder === '') {
    folderPath = '/'
  } else {
    folderPath = folder.replace(/^\//, '')
  }
  
  const targetDir = join(downloadsDir, folderPath === '/' ? '' : folderPath)

  try {
    await mkdir(downloadsDir, { recursive: true })
    await mkdir(targetDir, { recursive: true })
    
    console.log(`[hyperdrive] Starting parallel folder download: ${folder}`)
    console.log(`[hyperdrive] Normalized folder path: ${folderPath}`)
    console.log(`[hyperdrive] Using config:`, {
      concurrentDownloads: config.concurrentDownloads,
      enablePrefetching: config.enablePrefetching,
      enableStreaming: config.enableStreaming
    })
    
    // Set up progress batching and smart prefetching
    const progressBatcher = onProgress ? new ProgressBatcher(onProgress, config.progressBatchInterval) : null
    const prefetcher = new SmartPrefetcher(drive, config.enablePrefetching, config.prefetchBatchSize)
    
    // First, download all blobs for the folder using the proper Hyperdrive API
    console.log(`[hyperdrive] Downloading all blobs for folder: ${folderPath}`)
    try {
      const download = await drive.download(folderPath, { recursive: true, wait: false })
      // Don't wait for completion - let it download in background
      console.log(`[hyperdrive] Started background download for folder: ${folderPath}`)
    } catch (err) {
      console.warn(`[hyperdrive] Background download failed for ${folderPath}:`, err)
    }
    
    // Collect all files first
    const files: Array<{ key: string; value: any }> = []
    for await (const entry of drive.list(folderPath, { recursive: true })) {
      if (entry?.key && (!!entry?.value?.blob || !!entry?.value?.linkname)) {
        files.push(entry)
      }
    }
    
    const totalFiles = files.length
    console.log(`[hyperdrive] Total files to download: ${totalFiles}`)
    
    if (totalFiles === 0) {
      throw new Error(`Folder "${folderPath}" is empty or does not exist`)
    }
    
    // Process files in parallel batches
    const batches = chunkArray(files, config.concurrentDownloads)
    
    let fileCount = 0
    let processedFiles = 0
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]
      
      // Start prefetching next batch while current batch is processing
      if (batchIndex < batches.length - 1) {
        const nextBatchStartIndex = (batchIndex + 1) * config.concurrentDownloads
        prefetcher.prefetchFiles(files, nextBatchStartIndex - 1, config.concurrentDownloads)
      }
      
      const batchPromises = batch.map(async (entry, entryIndex) => {
        // Wait for prefetch if available
        await prefetcher.waitForPrefetch(entry.key)
        
        const result = await downloadFileParallel(drive, entry, targetDir, folderPath, progressBatcher!, totalFiles, config)
        
        processedFiles++
        
        if (result.success) {
          fileCount++
        }
        
        // Report progress
        if (progressBatcher) {
          progressBatcher.addUpdate({
            currentFile: entry.key,
            downloadedFiles: processedFiles,
            totalFiles
          })
        }
        
        return result
      })
      
      // Wait for all files in this batch to complete
      const batchResults = await Promise.allSettled(batchPromises)
      
      // Log batch results
      const successful = batchResults.filter(r => r.status === 'fulfilled' && r.value.success).length
      const failed = batchResults.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length
      
      console.log(`[hyperdrive] Batch ${batchIndex + 1}/${batches.length} completed: ${successful} successful, ${failed} failed`)
    }

    // Cleanup prefetcher and flush any remaining progress updates
    prefetcher.cleanup()
    if (progressBatcher) {
      progressBatcher.destroy()
    }

    console.log(`[hyperdrive] Parallel folder download completed. Files processed: ${processedFiles}, Files downloaded: ${fileCount}`)

    if (fileCount === 0) {
      throw new Error(`No downloadable files found in folder "${folderPath}"`)
    }

    return { success: true, downloadPath: targetDir, fileCount }
  } catch (err) {
    console.error(`[hyperdrive] downloadFolderToDownloads failed for ${driveId} ${folder}:`, err)
    throw err
  }
}

/**
 * Clear all content from a drive
 */
export async function clearDriveContent(driveId: string, onProgress?: (currentItem: string, deletedCount: number, totalItems: number) => void): Promise<{ deletedCount: number }> {
  console.log(`[hyperdrive] clearDriveContent called for driveId=${driveId}`)
  
  try {
    const drive = activeDrives.get(driveId)?.hyperdrive
    if (!drive) {
      throw new Error(`Drive ${driveId} not found`)
    }

    let deletedCount = 0

    // Get all files and folders in the root directory using list method
    const rootFiles: string[] = []
    const allFiles: any[] = []
    const rootDirectories = new Set<string>()
    
    for await (const file of drive.list('/', { recursive: true })) {
      allFiles.push(file)
      // Get the relative path from root
      const relativePath = file.key === '/' ? '' : file.key.substring(1) // Remove leading slash
      
      if (relativePath) {
        // Extract the first part of the path (root level directory)
        const firstSlash = relativePath.indexOf('/')
        if (firstSlash === -1) {
          // Direct file in root
          rootFiles.push(relativePath)
        } else {
          // File in subdirectory - add the root directory to our set
          const rootDir = relativePath.substring(0, firstSlash)
          rootDirectories.add(rootDir)
        }
      }
    }
    
    // Also check for .chunks folders that might not be detected as root directories
    // because they contain files (like .keep, manifest.json, chunk.000, etc.)
    for await (const file of drive.list('/', { recursive: true })) {
      const relativePath = file.key === '/' ? '' : file.key.substring(1)
      if (relativePath && relativePath.endsWith('.chunks')) {
        const rootDir = relativePath
        if (!rootDirectories.has(rootDir)) {
          rootDirectories.add(rootDir)
          console.log(`[hyperdrive] Found .chunks folder: ${rootDir}`)
        }
      }
    }
    
    // Add all root directories to the files to delete
    rootFiles.push(...Array.from(rootDirectories))
    
    console.log(`[hyperdrive] All files found:`, allFiles.length, 'total files')
    console.log(`[hyperdrive] Root level directories:`, Array.from(rootDirectories))
    console.log(`[hyperdrive] Root level files:`, rootFiles)
    
    if (rootFiles.length === 0) {
      console.log(`[hyperdrive] No items found in root directory`)
      return { deletedCount: 0 }
    }
    
    const totalItems = rootFiles.length
    console.log(`[hyperdrive] Found ${totalItems} items in root directory`)

    // Use the proven individual deletion approach (drive.purge() has compatibility issues)
    console.log(`[hyperdrive] Using individual deletion approach to clear all content`)
    
    // Use drive.clearAll() to clear all blobs from storage first
    console.log(`[hyperdrive] Using drive.clearAll() to remove all blobs from storage`)
    const cleared = await drive.clearAll({ diff: true })
    console.log(`[hyperdrive] clearAll result:`, cleared)

    // Now delete all the file structure entries using the same pattern as deleteFile
    for (let i = 0; i < rootFiles.length; i++) {
      const item = rootFiles[i]
      try {
        const itemPath = `/${item}`
        
        // Emit progress event
        if (onProgress) {
          onProgress(item, deletedCount, totalItems)
        }
        
        // First check if this is a pseudo-file (chunked file) - same logic as deleteFile
        const entries = await listDrive(driveId, '/', true)
        const pseudoFile = entries.find(entry => entry.key === itemPath)
        
        if (pseudoFile?.value?.metadata) {
          try {
            const metadata = JSON.parse(pseudoFile.value.metadata)
            if (metadata.is_chunked && metadata.chunkFolder) {
              console.log(`[hyperdrive] clearDriveContent ${itemPath}: deleting pseudo-file, targeting chunks folder: ${metadata.chunkFolder}`)
              // Delete the entire .chunks folder
              await deleteFolderContents(drive, metadata.chunkFolder)
              console.log(`[hyperdrive] clearDriveContent ${itemPath}: successfully deleted chunked file`)
              deletedCount++
              continue
            }
          } catch (e) {
            // Not a pseudo-file, continue with normal processing
          }
        }
        
        // Use the same pattern as deleteFile for each item
        const isFolderPath = await isFolder(drive, itemPath)
        console.log(`[hyperdrive] clearDriveContent ${itemPath}: isFolder=${isFolderPath}`)
        
        if (isFolderPath) {
          // Handle folder deletion using the same pattern as deleteFile
          console.log(`[hyperdrive] clearDriveContent ${itemPath}: deleting folder and all contents`)
          await deleteFolderContents(drive, itemPath)
        } else {
          // Handle file deletion using the same pattern as deleteFile
          const existsBefore = await drive.exists(itemPath)
          console.log(`[hyperdrive] clearDriveContent ${itemPath}: exists before=${existsBefore}`)
          
          if (!existsBefore) {
            console.log(`[hyperdrive] clearDriveContent ${itemPath}: file does not exist, nothing to delete`)
            deletedCount++
            continue
          }
        
          // Read entry BEFORE deletion so we can get the blob reference to clear
          const entryBefore = await drive.entry(itemPath)
          const blobRef = entryBefore?.value?.blob
          console.log(`[hyperdrive] clearDriveContent ${itemPath}: entry blob before del=`, blobRef)

          // Remove file entry from drive structure
          await drive.del(itemPath)
          console.log(`[hyperdrive] clearDriveContent ${itemPath}: del() completed`)
          
          // Free blob storage to reclaim disk space using explicit blob reference if available
          let cleared: any = null
          if (blobRef) {
            try {
              const blobs = await drive.getBlobs()
              cleared = await blobs.clear(blobRef, { diff: true })
              console.log(`[hyperdrive] clearDriveContent ${itemPath}: blobs.clear() completed, cleared bytes:`, cleared)
            } catch (err) {
              console.warn(`[hyperdrive] clearDriveContent ${itemPath}: blobs.clear failed, falling back to drive.clear`, err)
              // Fallback to path-based clear
              cleared = await drive.clear(itemPath, { diff: true })
              console.log(`[hyperdrive] clearDriveContent ${itemPath}: drive.clear() completed, cleared bytes:`, cleared)
            }
          } else {
            // No blobRef (e.g., symlink) - attempt path-based clear anyway
            cleared = await drive.clear(itemPath, { diff: true })
            console.log(`[hyperdrive] clearDriveContent ${itemPath}: drive.clear() (no blobRef) completed, cleared bytes:`, cleared)
          }
        }
        
        deletedCount++
        console.log(`[hyperdrive] clearDriveContent ${itemPath}: deleted successfully`)
        
      } catch (err) {
        console.warn(`[hyperdrive] clearDriveContent: Failed to delete ${item}:`, err)
        // Continue with other items even if one fails
      }
    }

    console.log(`[hyperdrive] clearDriveContent completed. Deleted ${deletedCount} items`)
    
    // Verify what's left in the drive
    const remainingFiles: string[] = []
    for await (const file of drive.list('/', { recursive: true })) {
      const relativePath = file.key === '/' ? '' : file.key.substring(1)
      if (relativePath) {
        const firstSlash = relativePath.indexOf('/')
        if (firstSlash === -1) {
          remainingFiles.push(relativePath)
        } else {
          const rootDir = relativePath.substring(0, firstSlash)
          if (!remainingFiles.includes(rootDir)) {
            remainingFiles.push(rootDir)
          }
        }
      }
    }
    console.log(`[hyperdrive] Remaining files after deletion:`, remainingFiles)
    
    // Update drive and broadcast changes (same as deleteFile)
    try { 
      await drive.update({ wait: false }) 
    } catch {}
    broadcastDriveChanged(driveId)
    
    return { deletedCount }
  } catch (err) {
    console.error(`[hyperdrive] clearDriveContent failed for ${driveId}:`, err)
    throw err
  }
}



