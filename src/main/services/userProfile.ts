import { promises as fs } from 'fs'
import { dirname, join } from 'path'
import { app } from 'electron'

export type UserProfile = Record<string, unknown>

const PROFILE_FILENAME = 'profile.json'

function getProfileDir(): string {
  const baseDir = app.getPath('userData')
  return join(baseDir, 'hyperdrive')
}

export function getProfilePath(): string {
  return join(getProfileDir(), PROFILE_FILENAME)
}

async function ensureDir(filePath: string): Promise<void> {
  try {
    await fs.mkdir(dirname(filePath), { recursive: true })
  } catch {}
}

export async function readUserProfile(): Promise<UserProfile> {
  const path = getProfilePath()
  try {
    const data = await fs.readFile(path, 'utf-8')
    const parsed = JSON.parse(data)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch (err: any) {
    if (err && (err.code === 'ENOENT' || err.code === 'ENOTDIR')) {
      return {}
    }
    throw err
  }
}

export async function writeUserProfile(profile: UserProfile): Promise<void> {
  const path = getProfilePath()
  await ensureDir(path)
  const data = JSON.stringify(profile, null, 2)
  await fs.writeFile(path, data, 'utf-8')
}


