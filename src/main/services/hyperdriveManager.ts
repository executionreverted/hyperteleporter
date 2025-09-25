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
  await Promise.all(entries.map(async ([id, w]) => { // eslint-disable-line @typescript-eslint/no-unused-vars
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

  const initialized: InitializedDrive = { record, corestore, hyperdrive }
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
    const drive: InitializedDrive = { record: normalizedRecord, corestore, hyperdrive }
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
  const initialized: InitializedDrive = { record, corestore, hyperdrive }
  activeDrives.set(id, initialized)
  return initialized
}

export function getActiveDrive(id: string): InitializedDrive | undefined {
  return activeDrives.get(id)
}

export function listActiveDrives(): InitializedDrive[] {
  return Array.from(activeDrives.values())
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

export async function getFileBuffer(driveId: string, path: string): Promise<Buffer | null> {
  const drive = activeDrives.get(driveId)?.hyperdrive
  if (!drive) throw new Error('Drive not found')
  const normalized = path.startsWith('/') ? path : `/${path}`
  // If it's a folder marker, ignore
  if (normalized.endsWith('/.keep')) return null

  // Try direct get() first
  try {
    // @ts-ignore
    const maybe = await (drive as any).get(normalized)
    if (maybe) {
      if (Buffer.isBuffer(maybe)) {
        const direct = Buffer.from(maybe)
        console.log(`[hyperdrive] getFileBuffer get() ${normalized}: bytes=${direct.length}`)
        if (direct.length > 0) return direct
      } else {
        console.log(`[hyperdrive] getFileBuffer get() ${normalized}: non-buffer result`)
      }
    }
  } catch (err) {
    console.warn(`[hyperdrive] getFileBuffer get() failed for ${normalized}:`, err)
  }

  // Read file content via stream as a fallback to ensure we get the actual bytes
  try {
    // @ts-ignore - hyperdrive createReadStream exists at runtime
    const readStream = (drive as any).createReadStream(normalized)
    const chunks: Buffer[] = []
    for await (const chunk of readStream) {
      const buf = Buffer.isBuffer(chunk) ? (chunk as Buffer) : Buffer.from(chunk)
      chunks.push(buf)
    }
    const data = Buffer.concat(chunks)
    console.log(`[hyperdrive] getFileBuffer stream ${normalized}: bytes=${data.length}`)
    if (data.length > 0) return data
  } catch (err) {
    console.warn(`[hyperdrive] getFileBuffer stream failed for ${normalized}:`, err)
  }

  // As a diagnostic: scan list to see if entry reports a blob length
  try {
    for await (const file of (drive as any).list('/', { recursive: true })) {
      if (file?.key === normalized) {
        const reported = file?.value?.blob?.byteLength || file?.value?.blob?.length || 0
        console.log(`[hyperdrive] getFileBuffer diag ${normalized}: reported blob length=${reported}`)
        break
      }
    }
  } catch {}

  return null
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


