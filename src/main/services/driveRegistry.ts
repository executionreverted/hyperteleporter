import { promises as fs } from 'fs'
import { dirname, join } from 'path'
import { app } from 'electron'

export type DriveRecord = {
  id: string
  name: string
  storageDir: string
  publicKeyHex: string
  contentKeyHex?: string
  createdAt: string
}

type Registry = {
  drives: DriveRecord[]
}

const REGISTRY_FILENAME = 'drives.json'

function getRegistryDir(): string {
  const baseDir = app.getPath('userData')
  return join(baseDir, 'hyperdrive')
}

export function getRegistryPath(): string {
  return join(getRegistryDir(), REGISTRY_FILENAME)
}

async function ensureDir(filePath: string): Promise<void> {
  try {
    await fs.mkdir(dirname(filePath), { recursive: true })
  } catch {}
}

export async function readRegistry(): Promise<Registry> {
  const path = getRegistryPath()
  try {
    const data = await fs.readFile(path, 'utf-8')
    const parsed = JSON.parse(data)
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.drives)) {
      return { drives: [] }
    }
    return { drives: parsed.drives as DriveRecord[] }
  } catch (err: any) {
    if (err && (err.code === 'ENOENT' || err.code === 'ENOTDIR')) {
      return { drives: [] }
    }
    throw err
  }
}

export async function writeRegistry(registry: Registry): Promise<void> {
  const path = getRegistryPath()
  await ensureDir(path)
  const data = JSON.stringify(registry, null, 2)
  await fs.writeFile(path, data, 'utf-8')
}

export async function addOrUpdateDrive(record: DriveRecord): Promise<void> {
  const registry = await readRegistry()
  const index = registry.drives.findIndex((d) => d.id === record.id)
  if (index >= 0) registry.drives[index] = record
  else registry.drives.push(record)
  await writeRegistry(registry)
}

export async function removeDrive(id: string): Promise<void> {
  const registry = await readRegistry()
  const filtered = registry.drives.filter((d) => d.id !== id)
  if (filtered.length !== registry.drives.length) {
    await writeRegistry({ drives: filtered })
  }
}

export async function listDriveRecords(): Promise<DriveRecord[]> {
  const registry = await readRegistry()
  return registry.drives
}

export async function getDriveRecordById(id: string): Promise<DriveRecord | undefined> {
  const registry = await readRegistry()
  return registry.drives.find((d) => d.id === id)
}


