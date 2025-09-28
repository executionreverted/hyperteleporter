import { app, shell, BrowserWindow, ipcMain, screen } from 'electron' 
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
const icon = join(__dirname, '../../build/icon.png')
import { initializeAllDrives, closeAllDrives, createDrive, listActiveDrives, listDrive, createFolder, uploadFiles, uploadFolder, getFileBuffer, deleteFile, getDriveStorageInfo, joinDrive, stopAllDriveWatchers, getFolderStats, downloadFolderToDownloads, downloadFileToDownloads, checkDriveSyncStatus, getDriveSyncStatus, clearDriveContent } from './services/hyperdriveManager'
import { addDownload, readDownloads, removeDownload } from './services/downloads'
// Swarm management is now handled by hyperdriveManager
import { readUserProfile, writeUserProfile } from './services/userProfile'
import { autoUpdater } from 'electron-updater'
import { 
  isAutolaunchEnabled, 
  enableAutolaunch, 
  disableAutolaunch, 
  toggleAutolaunch, 
  getAutolaunchSettings,
  wasLaunchedAtStartup 
} from './services/autolaunch'

// Handle squirrel startup events (Windows installer)
if (require('electron-squirrel-startup')) {
  app.quit()
}

function createWindow(): void {
  // Create the browser window.
  const { width: displayWidth, height: displayHeight } = screen.getPrimaryDisplay().workAreaSize

  // Aim for 80% of the primary display's work area, but never below 1280x720
  const initialWidth = Math.max(1280, Math.floor(displayWidth * 0.8))
  const initialHeight = Math.max(720, Math.floor(displayHeight * 0.8))

  const mainWindow = new BrowserWindow({
    width: initialWidth,
    height: initialHeight,
    minWidth: 1280,
    minHeight: 720,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })
  // Allow blob: images in CSP injected by Electron for dev server if needed
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const headers = details.responseHeaders || {}
    const cspKey = Object.keys(headers).find(k => k.toLowerCase() === 'content-security-policy')
    if (cspKey) {
      const csp = headers[cspKey][0]
      if (csp) {
        if (!/img-src[^;]*blob:/.test(csp)) {
          headers[cspKey][0] = headers[cspKey][0].replace(/img-src([^;]*)/, (_, g1) => `img-src${g1} blob:`)
        }
        if (!/media-src[^;]*blob:/.test(headers[cspKey][0])) {
          if (/media-src[^;]*/.test(headers[cspKey][0])) {
            headers[cspKey][0] = headers[cspKey][0].replace(/media-src([^;]*)/, (_, g1) => `media-src${g1} blob:`)
          } else {
            headers[cspKey][0] += '; media-src \"self\" blob:'
          }
        }
        if (!/media-src[^;]*data:/.test(headers[cspKey][0])) {
          if (/media-src[^;]*/.test(headers[cspKey][0])) {
            headers[cspKey][0] = headers[cspKey][0].replace(/media-src([^;]*)/, (_, g1) => `media-src${g1} data:`)
          } else {
            headers[cspKey][0] += '; media-src \"self\" data:'
          }
        }
      }
    }
    callback({ responseHeaders: headers })
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Register global shortcuts
function registerGlobalShortcuts(): void {
  // Note: All global shortcuts removed to avoid interfering with other applications
  // - Ctrl+R: Browser refresh functionality
  // - Ctrl+Shift+R: Browser hard refresh functionality  
  // - Ctrl+F: Browser search functionality
  // App-specific shortcuts can be handled in the renderer process instead
  console.log('Global shortcuts disabled to prevent interference with browser functionality')
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Initialize stored drives on boot
  console.log('[main] Starting initializeAllDrives')
  initializeAllDrives().then(() => {
    console.log('[main] initializeAllDrives completed successfully')
    
    // Notify all renderer windows that drives are ready
    const windows = BrowserWindow.getAllWindows()
    console.log(`[main] Sending drives:initialized event to ${windows.length} windows`)
    for (const win of windows) {
      try {
        win.webContents.send('drives:initialized')
        console.log('[main] Sent drives:initialized to window')
      } catch (err) {
        console.error('[main] Failed to send drives:initialized to window:', err)
      }
    }
  }).catch((err) => {
    console.error('[main] initializeAllDrives failed', err)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // Expose drives IPC
  ipcMain.handle('drives:list', async () => {
    console.log('[main] drives:list called')
    const drives = listActiveDrives().map((d) => ({
      id: d.record.id,
      name: d.record.name,
      publicKeyHex: d.record.publicKeyHex,
      createdAt: d.record.createdAt,
      type: d.record.type ?? 'owned'
    }))
    console.log('[main] drives:list returning:', drives)
    return drives
  })

  ipcMain.handle('drives:create', async (_evt, name: string) => {
    const d = await createDrive(name)
    return {
      id: d.record.id,
      name: d.record.name,
      publicKeyHex: d.record.publicKeyHex,
      createdAt: d.record.createdAt,
      type: d.record.type ?? 'owned'
    }
  })

  ipcMain.handle('drives:join', async (_evt, { name, publicKeyHex }: { name: string, publicKeyHex: string }) => {
    console.log('[main] drives:join called', { name, publicKeyHex })
    const d = await joinDrive(name, publicKeyHex)
    return {
      id: d.record.id,
      name: d.record.name,
      publicKeyHex: d.record.publicKeyHex,
      createdAt: d.record.createdAt,
      type: d.record.type ?? 'readonly'
    }
  })

  ipcMain.handle('drives:listFolder', async (_evt, { driveId, folder, recursive }: { driveId: string, folder: string, recursive?: boolean }) => {
    const entries = await listDrive(driveId, folder, !!recursive)
    return entries
  })

  ipcMain.handle('drives:createFolder', async (_evt, { driveId, folderPath }: { driveId: string, folderPath: string }) => {
    await createFolder(driveId, folderPath)
    return true
  })

  ipcMain.handle('drives:uploadFiles', async (_evt, { driveId, folderPath, files }: { driveId: string, folderPath: string, files: Array<{ name: string; data: any }> }) => {
    console.log('[ipc] drives:uploadFiles', {
      driveId,
      folderPath,
      files: files?.map((f) => ({ name: f.name, hasData: !!f.data, type: typeof f.data, dataKeys: f.data ? Object.keys(f.data) : [] }))
    })
    // Normalize incoming data to Node Buffers
    const normalized = files.map(f => {
      const data = f.data
      const buf = Buffer.isBuffer(data)
        ? data
        : (data && data.byteLength !== undefined && typeof data.length === 'number' && data.buffer instanceof ArrayBuffer)
          ? Buffer.from(data)
          : (data && data.buffer instanceof ArrayBuffer)
            ? Buffer.from(new Uint8Array(data.buffer))
            : (data instanceof ArrayBuffer)
              ? Buffer.from(new Uint8Array(data))
              : Buffer.from([])
      return { name: f.name, data: buf }
    })
    console.log('[ipc] drives:uploadFiles normalized', normalized.map(n => ({ name: n.name, bytes: n.data.length })))
    const res = await uploadFiles(driveId, folderPath, normalized)
    return res
  })

  ipcMain.handle('drives:uploadFolder', async (_evt, { driveId, folderPath, files }: { driveId: string, folderPath: string, files: Array<{ name: string; data: any; relativePath: string }> }) => {
    console.log('[ipc] drives:uploadFolder', {
      driveId,
      folderPath,
      files: files?.map((f) => ({ name: f.name, relativePath: f.relativePath, hasData: !!f.data, type: typeof f.data, dataKeys: f.data ? Object.keys(f.data) : [] }))
    })
    // Normalize incoming data to Node Buffers
    const normalized = files.map(f => {
      const data = f.data
      const buf = Buffer.isBuffer(data)
        ? data
        : (data && data.byteLength !== undefined && typeof data.length === 'number' && data.buffer instanceof ArrayBuffer)
          ? Buffer.from(data)
          : (data && data.buffer instanceof ArrayBuffer)
            ? Buffer.from(new Uint8Array(data.buffer))
            : (data instanceof ArrayBuffer)
              ? Buffer.from(new Uint8Array(data))
              : Buffer.from([])
      return { name: f.name, data: buf, relativePath: f.relativePath }
    })
    console.log('[ipc] drives:uploadFolder normalized', normalized.map(n => ({ name: n.name, relativePath: n.relativePath, bytes: n.data.length })))
    const res = await uploadFolder(driveId, folderPath, normalized)
    return res
  })

  ipcMain.handle('drives:getFile', async (_evt, { driveId, path }: { driveId: string, path: string }) => {
    console.log(`[ipc] drives:getFile request: driveId=${driveId}, path=${path}`)
    const buf = await getFileBuffer(driveId, path)
    if (!buf) {
      console.log(`[ipc] drives:getFile ${path}: file not found or null`)
      return null
    }
    // Create a completely new ArrayBuffer to avoid any offset issues
    const newBuffer = new ArrayBuffer(buf.length)
    const view = new Uint8Array(newBuffer)
    view.set(buf)
    console.log(`[ipc] drives:getFile ${path}: original offset=${buf.byteOffset}, length=${buf.length}, new buffer length=${newBuffer.byteLength}`)
    return newBuffer
  })

  ipcMain.handle('drives:deleteFile', async (_evt, { driveId, path }: { driveId: string, path: string }) => {
    console.log(`[ipc] drives:deleteFile request: driveId=${driveId}, path=${path}`)
    const success = await deleteFile(driveId, path)
    console.log(`[ipc] drives:deleteFile ${path}: success=${success}`)
    return success
  })

  ipcMain.handle('drives:getStorageInfo', async (_evt, { driveId }: { driveId: string }) => {
    console.log(`[ipc] drives:getStorageInfo request: driveId=${driveId}`)
    const info = await getDriveStorageInfo(driveId)
    console.log(`[ipc] drives:getStorageInfo ${driveId}: blobsLength=${info.blobsLength}, version=${info.version}`)
    return info
  })

  ipcMain.handle('drives:getFolderStats', async (_evt, { driveId, folder }: { driveId: string, folder: string }) => {
    console.log(`[ipc] drives:getFolderStats request: driveId=${driveId}, folder=${folder}`)
    const stats = await getFolderStats(driveId, folder)
    console.log(`[ipc] drives:getFolderStats ${driveId} ${folder}:`, stats)
    return stats
  })

  ipcMain.handle('drives:downloadFile', async (_evt, { driveId, filePath, fileName, driveName }: { driveId: string, filePath: string, fileName: string, driveName: string }) => {
    console.log(`[ipc] drives:downloadFile request: driveId=${driveId}, filePath=${filePath}, fileName=${fileName}, driveName=${driveName}`)
    try {
      const result = await downloadFileToDownloads(driveId, filePath, fileName, driveName)
      const downloadRecord = {
        id: Date.now().toString(),
        driveId,
        folderPath: filePath,
        folderName: fileName,
        downloadPath: result.downloadPath,
        fileCount: 1,
        downloadedAt: new Date().toISOString(),
        status: 'completed' as const
      }
      await addDownload(downloadRecord)
      console.log(`[ipc] drives:downloadFile ${driveId} ${filePath}: downloaded to ${result.downloadPath}`)
      return { success: true, downloadPath: result.downloadPath }
    } catch (error) {
      console.error(`[ipc] drives:downloadFile failed:`, error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('drives:downloadFolder', async (event, { driveId, folder, folderName, driveName }: { driveId: string, folder: string, folderName: string, driveName: string }) => {
    console.log(`[ipc] drives:downloadFolder request: driveId=${driveId}, folder=${folder}, folderName=${folderName}, driveName=${driveName}`)
    try {
      const downloadId = `download-${Date.now()}`
      const result = await downloadFolderToDownloads(driveId, folder, folderName, driveName, (currentFile, downloadedFiles, totalFiles) => {
        // Send progress update to renderer
        console.log(`[ipc] Sending download progress: file=${currentFile}, downloaded=${downloadedFiles}, total=${totalFiles}`)
        event.sender.send('download-progress', {
          downloadId,
          currentFile,
          downloadedFiles,
          totalFiles,
          folderName
        })
      })
      const downloadRecord = {
        id: Date.now().toString(),
        driveId,
        folderPath: folder,
        folderName,
        downloadPath: result.downloadPath,
        fileCount: result.fileCount,
        downloadedAt: new Date().toISOString(),
        status: 'completed' as const
      }
      await addDownload(downloadRecord)
      console.log(`[ipc] drives:downloadFolder ${driveId} ${folder}: downloaded ${result.fileCount} files to ${result.downloadPath}`)
      return { success: true, downloadPath: result.downloadPath, fileCount: result.fileCount }
    } catch (error) {
      console.error(`[ipc] drives:downloadFolder failed:`, error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('downloads:list', async () => {
    console.log('[ipc] downloads:list called')
    const downloads = await readDownloads()
    return downloads
  })

  ipcMain.handle('downloads:remove', async (_evt, { id }: { id: string }) => {
    console.log(`[ipc] downloads:remove called for id=${id}`)
    await removeDownload(id)
    return true
  })

  ipcMain.handle('downloads:openFolder', async (_evt, { path }: { path: string }) => {
    console.log(`[ipc] downloads:openFolder called for path=${path}`)
    try {
      const { stat } = await import('fs/promises')
      const { dirname } = await import('path')
      try {
        const s = await stat(path)
        if (s.isDirectory()) {
          // Open the directory itself
          const result = await shell.openPath(path)
          if (result) {
            // shell.openPath returns an empty string on success, error message otherwise
            console.warn(`[ipc] downloads:openFolder openPath returned warning: ${result}`)
          }
          return { success: true }
        }
        // It's a file: reveal it in folder
        shell.showItemInFolder(path)
        return { success: true }
      } catch (statErr) {
        console.warn(`[ipc] downloads:openFolder stat failed, falling back:`, statErr)
        // Fallback: try to reveal parent folder
        try {
          shell.showItemInFolder(path)
          return { success: true }
        } catch (revealErr) {
          console.warn(`[ipc] downloads:openFolder reveal failed, trying to open dirname`, revealErr)
          const parent = dirname(path)
          const result = await shell.openPath(parent)
          if (result) console.warn(`[ipc] downloads:openFolder openPath dirname returned: ${result}`)
          return { success: true }
        }
      }
    } catch (error) {
      console.error(`[ipc] downloads:openFolder failed:`, error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('drive:clearContent', async (event, { driveId }: { driveId: string }) => {
    console.log(`[ipc] drive:clearContent called for driveId=${driveId}`)
    try {
      const result = await clearDriveContent(driveId, (currentItem, deletedCount, totalItems) => {
        // Send progress update to renderer
        console.log(`[ipc] Sending clear progress: item=${currentItem}, deleted=${deletedCount}, total=${totalItems}`)
        event.sender.send('clear-content-progress', {
          currentItem,
          deletedCount,
          totalItems,
          progress: totalItems > 0 ? (deletedCount / totalItems) * 100 : 0
        })
      })
      return { success: true, deletedCount: result.deletedCount }
    } catch (error) {
      console.error(`[ipc] drive:clearContent failed:`, error)
      return { success: false, error: String(error) }
    }
  })

  // Drive sync status IPC handlers
  ipcMain.handle('drives:checkSyncStatus', async (_evt, { driveId }: { driveId: string }) => {
    // console.log(`[ipc] drives:checkSyncStatus called for driveId=${driveId}`)
    try {
      const status = await checkDriveSyncStatus(driveId)
      // console.log(`[ipc] drives:checkSyncStatus ${driveId}:`, status)
      return status
    } catch (error) {
      console.error(`[ipc] drives:checkSyncStatus failed:`, error)
      return { isSyncing: false, version: 0, peers: 0, isFindingPeers: false }
    }
  })

  ipcMain.handle('drives:getSyncStatus', async (_evt, { driveId }: { driveId: string }) => {
    // console.log(`[ipc] drives:getSyncStatus called for driveId=${driveId}`)
    const isSyncing = getDriveSyncStatus(driveId)
    return { isSyncing }
  })

  // Expose user profile IPC (persisted on disk, separate from Hyperdrive for now)
  ipcMain.handle('user:getProfile', async () => {
    // console.log('[main] user:getProfile called')
    const profile = await readUserProfile()
    console.log('[main] user:getProfile returning:', profile)
    return profile
  })

  ipcMain.handle('user:updateProfile', async (_evt, profile: unknown) => {
    console.log('[main] user:updateProfile called with:', profile)
    const p = (profile && typeof profile === 'object') ? (profile as Record<string, unknown>) : {}
    await writeUserProfile(p)
    console.log('[main] user:updateProfile completed')
    return true
  })

  // Autolaunch IPC handlers
  ipcMain.handle('autolaunch:isEnabled', async () => {
    console.log('[main] autolaunch:isEnabled called')
    const enabled = isAutolaunchEnabled()
    console.log('[main] autolaunch:isEnabled returning:', enabled)
    return enabled
  })

  ipcMain.handle('autolaunch:enable', async (_evt, options: { minimized?: boolean; hidden?: boolean } = {}) => {
    console.log('[main] autolaunch:enable called with options:', options)
    const success = enableAutolaunch(options)
    console.log('[main] autolaunch:enable returning:', success)
    return success
  })

  ipcMain.handle('autolaunch:disable', async () => {
    console.log('[main] autolaunch:disable called')
    const success = disableAutolaunch()
    console.log('[main] autolaunch:disable returning:', success)
    return success
  })

  ipcMain.handle('autolaunch:toggle', async (_evt, options: { minimized?: boolean; hidden?: boolean } = {}) => {
    console.log('[main] autolaunch:toggle called with options:', options)
    const success = toggleAutolaunch(options)
    console.log('[main] autolaunch:toggle returning:', success)
    return success
  })

  ipcMain.handle('autolaunch:getSettings', async () => {
    console.log('[main] autolaunch:getSettings called')
    const settings = getAutolaunchSettings()
    console.log('[main] autolaunch:getSettings returning:', settings)
    return settings
  })

  ipcMain.handle('autolaunch:wasLaunchedAtStartup', async () => {
    console.log('[main] autolaunch:wasLaunchedAtStartup called')
    const wasLaunched = wasLaunchedAtStartup()
    console.log('[main] autolaunch:wasLaunchedAtStartup returning:', wasLaunched)
    return wasLaunched
  })

  createWindow()

  // Register global shortcuts
  registerGlobalShortcuts()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

app.on('before-quit', () => {
  // Best-effort close of corestores and swarms
  closeAllDrives().catch(() => {})
  stopAllDriveWatchers().catch(() => {})
})
