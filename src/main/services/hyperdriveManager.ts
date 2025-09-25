import Corestore from 'corestore'
import Hyperdrive from 'hyperdrive'
import { join } from 'path'
import { getHyperdriveBaseDir } from './appPaths'
import { setupReplication, joinTopicOnce } from './swarm'
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

  // Setup swarm replication for this corestore and join discovery topic
  setupReplication(corestore)
  await joinTopicOnce(hyperdrive.discoveryKey)
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
  for (const record of records) {
    const corestore = new Corestore(record.storageDir)
    const hyperdrive = new Hyperdrive(corestore, Buffer.from(record.publicKeyHex, 'hex'))
    await hyperdrive.ready()
    setupReplication(corestore)
    await joinTopicOnce(hyperdrive.discoveryKey)
    await startDriveWatcher(record.id, hyperdrive)
    // Ensure backward compatibility: default type to 'owned' if missing
    const normalizedRecord: DriveRecord = { ...record, type: record.type ?? 'owned' }
    const drive: InitializedDrive = { record: normalizedRecord, corestore, hyperdrive, isSyncing: false }
    activeDrives.set(record.id, drive)
    initialized.push(drive)
  }
  return initialized
}

export async function joinDrive(name: string, publicKeyHex: string): Promise<InitializedDrive> {
  const id = randomUUID()
  const storageDir = resolveStorageDir(id)
  const corestore = new Corestore(storageDir)
  const hyperdrive = new Hyperdrive(corestore, Buffer.from(publicKeyHex, 'hex'))
  await hyperdrive.ready()

  setupReplication(corestore)
  await joinTopicOnce(hyperdrive.discoveryKey)
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

export async function checkDriveSyncStatus(driveId: string): Promise<{ isSyncing: boolean; version: number; peers: number; isFindingPeers: boolean }> {
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
      
      console.log(`[hyperdrive] Owned drive ${driveId}: syncing=false, version=${currentVersion}, peers=${peers}`)
      return { isSyncing: false, version: currentVersion, peers, isFindingPeers: false }
    }
    
    // For joined drives, check sync status
    const isFindingPeers = hyperdrive.findingPeers ? true : false
    const currentVersion = hyperdrive.version
    const peers = hyperdrive.core.peers?.length || 0
    
    // A drive is considered "connected" if it has peers
    // We only show "syncing" if we have no peers at all
    const isSyncing = peers === 0
    
    // Update the sync status in our map
    if (activeDrives.has(driveId)) {
      const currentDrive = activeDrives.get(driveId)!
      currentDrive.isSyncing = isSyncing
      activeDrives.set(driveId, currentDrive)
    }
    
    console.log(`[hyperdrive] Joined drive ${driveId}: syncing=${isSyncing}, version=${currentVersion}, peers=${peers}, findingPeers=${isFindingPeers}`)
    
    return { isSyncing, version: currentVersion, peers, isFindingPeers }
  } catch (err) {
    console.warn(`[hyperdrive] Failed to check sync status for ${driveId}:`, err)
    return { isSyncing: false, version: 0, peers: 0, isFindingPeers: false }
  }
}

export function getDriveSyncStatus(driveId: string): boolean {
  const drive = activeDrives.get(driveId)
  return drive?.isSyncing || false
}

export async function closeAllDrives(): Promise<void> {
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
  const listFolder = folder || '/'
  // Ensure folder starts with '/'
  const prefix = listFolder.startsWith('/') ? listFolder : `/${listFolder}`
  console.log(`[hyperdrive] listDrive driveId=${folderDriveId} prefix=${prefix} recursive=${recursive}`)
  for await (const file of drive.list('/', { recursive: true })) {
    const isFile = !!file?.value?.blob || !!file?.value?.linkname
    console.log(`[hyperdrive] entry key=${file.key} type=${isFile ? 'file' : 'folder'}`)
    // Only include items under prefix
    if (file.key.startsWith(prefix)) results.push({ key: file.key, value: file.value })
  }
  console.log(`[hyperdrive] listDrive done: ${results.length} entries`)
  return results
}

export async function createFolder(driveId: string, folderPath: string): Promise<void> {
  const drive = activeDrives.get(driveId)?.hyperdrive
  if (!drive) throw new Error('Drive not found')
  const base = folderPath.startsWith('/') ? folderPath : `/${folderPath}`
  // Create a directory marker file so the folder appears even when empty
  const markerPath = `${base.replace(/\/$/, '')}/.keep`
  await drive.put(markerPath, Buffer.alloc(0))
  try { await (drive as any).update({ wait: false }) } catch {}
  broadcastDriveChanged(driveId)
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
  for (const f of files) {
    const normalized = base === '/' ? `/${f.name}` : `${base.replace(/\/$/, '')}/${f.name}`
    console.log(`[hyperdrive] upload put -> ${normalized} (${f.data?.byteLength ?? f.data?.length ?? 0} bytes)`)
    await drive.put(normalized, f.data)
    uploaded += 1
  }
  console.log(`[hyperdrive] upload complete count=${uploaded}`)
  try {
    // Hint replication layer we expect updates soon
    // @ts-ignore - update exists at runtime
    await (drive as any).update({ wait: false })
  } catch {}
  broadcastDriveChanged(driveId)
  return { uploaded }
}

// Simple file buffer function using proper Hyperdrive API
export async function getFileBuffer(driveId: string, path: string): Promise<Buffer | null> {
  const drive = activeDrives.get(driveId)?.hyperdrive
  if (!drive) throw new Error('Drive not found')
  const normalized = path.startsWith('/') ? path : `/${path}`
  
  // If it's a folder marker, ignore
  if (normalized.endsWith('/.keep')) return null

  try {
    // Check if file exists
    const exists = await drive.exists(normalized)
    if (!exists) {
      console.log(`[hyperdrive] File does not exist: ${normalized}`)
      return null
    }

    // Get file data using drive.get() with proper options
    console.log(`[hyperdrive] Reading file: ${normalized}`)
    const data = await drive.get(normalized, { wait: true, timeout: 30000 })
    
    if (!data) {
      console.log(`[hyperdrive] File is empty: ${normalized}`)
      return null
    }

    console.log(`[hyperdrive] Successfully read file: ${normalized}, bytes=${data.length}`)
    return Buffer.isBuffer(data) ? data : Buffer.from(data)
  } catch (err) {
    console.error(`[hyperdrive] Failed to read file ${normalized}:`, err)
    return null
  }
}

export async function deleteFile(driveId: string, path: string): Promise<boolean> {
  const drive = activeDrives.get(driveId)?.hyperdrive
  if (!drive) throw new Error('Drive not found')
  const normalized = path.startsWith('/') ? path : `/${path}`
  
  try {
    // Check if file exists before deletion
    const existsBefore = await (drive as any).exists(normalized)
    console.log(`[hyperdrive] deleteFile ${normalized}: exists before=${existsBefore}`)
    
    if (!existsBefore) {
      console.log(`[hyperdrive] deleteFile ${normalized}: file does not exist, nothing to delete`)
      return true
    }
    
    // Read entry BEFORE deletion so we can get the blob reference to clear
    // @ts-ignore - hyperdrive entry method exists at runtime
    const entryBefore = await (drive as any).entry(normalized)
    const blobRef = entryBefore?.value?.blob
    console.log(`[hyperdrive] deleteFile ${normalized}: entry blob before del=`, blobRef)

    // Capture storage info before for diagnostics
    let blobsLengthBefore: number | undefined
    try {
      // @ts-ignore - getBlobsLength exists at runtime
      blobsLengthBefore = await (drive as any).getBlobsLength()
    } catch {}

    // Remove file entry from drive structure
    // @ts-ignore - hyperdrive del method exists at runtime
    await (drive as any).del(normalized)
    console.log(`[hyperdrive] deleteFile ${normalized}: del() completed`)
    
    // Free blob storage to reclaim disk space using explicit blob reference if available
    let cleared: any = null
    if (blobRef) {
      try {
        // @ts-ignore - hyperdrive getBlobs exists at runtime
        const blobs = await (drive as any).getBlobs()
        // @ts-ignore - blobs.clear exists at runtime
        cleared = await blobs.clear(blobRef, { diff: true })
        console.log(`[hyperdrive] deleteFile ${normalized}: blobs.clear() completed, cleared bytes:`, cleared)
      } catch (err) {
        console.warn(`[hyperdrive] deleteFile ${normalized}: blobs.clear failed, falling back to drive.clear`, err)
        // Fallback to path-based clear
        // @ts-ignore - hyperdrive clear method exists at runtime
        cleared = await (drive as any).clear(normalized, { diff: true })
        console.log(`[hyperdrive] deleteFile ${normalized}: drive.clear() completed, cleared bytes:`, cleared)
      }
    } else {
      // No blobRef (e.g., folder or symlink) - attempt path-based clear anyway
      // @ts-ignore
      cleared = await (drive as any).clear(normalized, { diff: true })
      console.log(`[hyperdrive] deleteFile ${normalized}: drive.clear() (no blobRef) completed, cleared bytes:`, cleared)
    }
    
    // Verify file is gone
    const existsAfter = await (drive as any).exists(normalized)
    console.log(`[hyperdrive] deleteFile ${normalized}: exists after=${existsAfter}`)
    
    // Capture storage info after for diagnostics
    try {
      // @ts-ignore - getBlobsLength exists at runtime
      const blobsLengthAfter = await (drive as any).getBlobsLength()
      console.log(`[hyperdrive] deleteFile ${normalized}: blobsLength before=${blobsLengthBefore} after=${blobsLengthAfter}`)
    } catch {}

    console.log(`[hyperdrive] deleteFile ${normalized}: deleted and cleared successfully`)
    try { await (drive as any).update({ wait: false }) } catch {}
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
  try {
    for await (const entry of (drive as any).list('/', { recursive: true })) {
      if (!entry?.key || !entry.key.startsWith(prefix)) continue
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
        folders += 1
      }
    }
  } catch (err) {
    console.warn(`[hyperdrive] getFolderStats failed for ${driveId} ${prefix}`, err)
  }
  return { files, folders, sizeBytes }
}

import { writeFile, mkdir } from 'fs/promises'
import { homedir } from 'os'

// Single file download using proper Hyperdrive API
export async function downloadFileToDownloads(driveId: string, filePath: string, fileName: string, driveName: string): Promise<{ success: boolean; downloadPath: string }> {
  const drive = activeDrives.get(driveId)?.hyperdrive
  if (!drive) throw new Error('Drive not found')
  
  const downloadsDir = join(homedir(), 'Downloads', 'HyperTeleporter', driveName)
  const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`
  
  try {
    await mkdir(downloadsDir, { recursive: true })

    // Check if file exists
    const exists = await drive.exists(normalizedPath)
    if (!exists) {
      throw new Error('File does not exist')
    }

    // Get file data using drive.get() with proper options
    console.log(`[hyperdrive] Downloading file: ${normalizedPath}`)
    const data = await drive.get(normalizedPath, { wait: true, timeout: 30000 })
    
    if (!data) {
      throw new Error('File is empty or could not be read')
    }

    // Create directory structure
    const pathParts = filePath.split('/').filter(Boolean)
    const dirPath = pathParts.slice(0, -1).join('/')
    const finalDir = dirPath ? join(downloadsDir, dirPath) : downloadsDir

    if (dirPath) {
      await mkdir(finalDir, { recursive: true })
    }

    const targetPath = join(finalDir, fileName)
    await writeFile(targetPath, data)

    console.log(`[hyperdrive] Downloaded file: ${fileName} to ${targetPath}`)
    return { success: true, downloadPath: targetPath }
  } catch (err) {
    console.error(`[hyperdrive] downloadFileToDownloads failed for ${driveId} ${filePath}:`, err)
    throw err
  }
}

// Folder download using proper Hyperdrive API
export async function downloadFolderToDownloads(driveId: string, folder: string, _folderName: string, driveName: string): Promise<{ success: boolean; downloadPath: string; fileCount: number }> {
  const drive = activeDrives.get(driveId)?.hyperdrive
  if (!drive) throw new Error('Drive not found')

  const downloadsDir = join(homedir(), 'Downloads', 'HyperTeleporter', driveName)
  const folderPath = folder === '/' ? '' : folder.replace(/^\//, '')
  const targetDir = join(downloadsDir, folderPath)

  try {
    await mkdir(downloadsDir, { recursive: true })
    await mkdir(targetDir, { recursive: true })
    
    console.log(`[hyperdrive] Starting folder download: ${folder}`)
    
    // First, download all blobs for the folder using the proper Hyperdrive API
    console.log(`[hyperdrive] Downloading all blobs for folder: ${folder}`)
    try {
      await drive.download(folder, { recursive: true, wait: false })
      // Don't wait for completion - let it download in background
      console.log(`[hyperdrive] Started background download for folder: ${folder}`)
    } catch (err) {
      console.warn(`[hyperdrive] Background download failed for ${folder}:`, err)
    }
    
    // Now list and download all files in the folder
    let fileCount = 0
    for await (const entry of drive.list(folder, { recursive: true })) {
      if (!entry?.key) continue
      
      const isFile = !!entry?.value?.blob || !!entry?.value?.linkname
      if (isFile) {
        try {
          console.log(`[hyperdrive] Downloading file: ${entry.key}`)
          // Prefetch this file's blobs to reduce timeouts
          try {
            await drive.download(entry.key, { wait: false })
            // best-effort prefetch; do not await
          } catch (e) {
            console.warn(`[hyperdrive] Prefetch failed for ${entry.key}:`, e)
          }

          // Try up to 3 times with small backoff to avoid transient timeouts
          let data: Buffer | null = null
          const attempts = 3
          for (let attempt = 1; attempt <= attempts; attempt++) {
            try {
              data = await drive.get(entry.key, { wait: true, timeout: 30000 })
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
            // Small backoff before next try
            await new Promise(r => setTimeout(r, 1000 * attempt))
          }
          
          if (data && data.length > 0) {
            // Calculate relative path from the folder
            const relativePath = entry.key.startsWith(folder) 
              ? entry.key.slice(folder.length).replace(/^\//, '')
              : entry.key.replace(/^\//, '')
            
            const filePath = join(targetDir, relativePath)
            const fileDir = join(targetDir, relativePath.split('/').slice(0, -1).join('/'))
            
            if (fileDir !== targetDir) {
              await mkdir(fileDir, { recursive: true })
            }

            await writeFile(filePath, data)
            fileCount++
            console.log(`[hyperdrive] Downloaded: ${relativePath}`)
          } else {
            console.warn(`[hyperdrive] Skipped (no data after retries): ${entry.key}`)
          }
        } catch (err) {
          console.error(`[hyperdrive] Failed to download file ${entry.key}:`, err)
        }
      }
    }

    console.log(`[hyperdrive] Folder download completed. Files downloaded: ${fileCount}`)

    if (fileCount === 0) {
      throw new Error('No files found in folder')
    }

    return { success: true, downloadPath: targetDir, fileCount }
  } catch (err) {
    console.error(`[hyperdrive] downloadFolderToDownloads failed for ${driveId} ${folder}:`, err)
    throw err
  }
}


