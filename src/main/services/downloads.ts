import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { getHyperdriveBaseDir } from './appPaths'

export interface DownloadRecord {
  id: string
  driveId: string
  folderPath: string
  folderName: string
  downloadPath: string
  fileCount: number
  downloadedAt: string
  status: 'completed' | 'failed'
}

const downloadsFile = join(getHyperdriveBaseDir(), 'downloads.json')

async function ensureDownloadsFile(): Promise<void> {
  try {
    await readFile(downloadsFile, 'utf8')
  } catch {
    // File doesn't exist, create it with empty array
    await writeFile(downloadsFile, JSON.stringify([], null, 2))
  }
}

export async function readDownloads(): Promise<DownloadRecord[]> {
  try {
    await ensureDownloadsFile()
    const data = await readFile(downloadsFile, 'utf8')
    return JSON.parse(data)
  } catch (error) {
    console.error('[downloads] Failed to read downloads:', error)
    return []
  }
}

export async function writeDownloads(downloads: DownloadRecord[]): Promise<void> {
  try {
    await ensureDownloadsFile()
    await writeFile(downloadsFile, JSON.stringify(downloads, null, 2))
  } catch (error) {
    console.error('[downloads] Failed to write downloads:', error)
  }
}

export async function addDownload(record: DownloadRecord): Promise<void> {
  const downloads = await readDownloads()
  downloads.unshift(record) // Add to beginning (most recent first)
  
  // Clean up downloads older than 15 days
  const fifteenDaysAgo = new Date()
  fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15)
  
  const recentDownloads = downloads.filter(download => {
    const downloadDate = new Date(download.downloadedAt)
    return downloadDate > fifteenDaysAgo
  })
  
  await writeDownloads(recentDownloads)
}

export async function removeDownload(id: string): Promise<void> {
  const downloads = await readDownloads()
  const filtered = downloads.filter(d => d.id !== id)
  await writeDownloads(filtered)
}

