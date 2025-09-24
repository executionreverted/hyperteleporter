import Corestore from 'corestore'
import Hyperdrive from 'hyperdrive'
import { join } from 'path'
import { app } from 'electron'
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

function resolveStorageDir(id: string): string {
  const baseDir = app.getPath('userData')
  return join(baseDir, 'hyperdrive', 'stores', id)
}

export async function createDrive(name: string): Promise<InitializedDrive> {
  const id = randomUUID()
  const storageDir = resolveStorageDir(id)
  const corestore = new Corestore(storageDir)
  const hyperdrive = new Hyperdrive(corestore)
  await hyperdrive.ready()

  const record: DriveRecord = {
    id,
    name,
    storageDir,
    publicKeyHex: hyperdrive.key.toString('hex'),
    contentKeyHex: hyperdrive.contentKey?.toString('hex'),
    createdAt: new Date().toISOString()
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
    const drive: InitializedDrive = { record, corestore, hyperdrive }
    activeDrives.set(record.id, drive)
    initialized.push(drive)
  }
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


