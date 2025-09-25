import { app } from 'electron'
import { join } from 'path'

let cachedUserDataDir: string | null = null

export function getUserDataDir(): string {
  if (cachedUserDataDir) return cachedUserDataDir
  const envDir = process.env.ELECTRON_USER_DATA_DIR
  const base = (envDir && envDir.trim().length > 0) ? envDir : app.getPath('userData')
  cachedUserDataDir = base
  return cachedUserDataDir
}

export function getHyperdriveBaseDir(): string {
  return join(getUserDataDir(), 'hyperdrive')
}


