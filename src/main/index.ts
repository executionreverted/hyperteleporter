import { app, shell, BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { initializeAllDrives, closeAllDrives, createDrive, listActiveDrives, listDrive, createFolder, uploadFiles, getFileBuffer, deleteFile, getDriveStorageInfo } from './services/hyperdriveManager'
import { readUserProfile, writeUserProfile } from './services/userProfile'

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
          headers[cspKey][0] = headers[cspKey][0].replace(/img-src([^;]*)/, (m, g1) => `img-src${g1} blob:`)
        }
        if (!/media-src[^;]*blob:/.test(headers[cspKey][0])) {
          if (/media-src[^;]*/.test(headers[cspKey][0])) {
            headers[cspKey][0] = headers[cspKey][0].replace(/media-src([^;]*)/, (m, g1) => `media-src${g1} blob:`)
          } else {
            headers[cspKey][0] += '; media-src \"self\" blob:'
          }
        }
        if (!/media-src[^;]*data:/.test(headers[cspKey][0])) {
          if (/media-src[^;]*/.test(headers[cspKey][0])) {
            headers[cspKey][0] = headers[cspKey][0].replace(/media-src([^;]*)/, (m, g1) => `media-src${g1} data:`)
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
  initializeAllDrives().catch((err) => {
    console.error('[hyperdrive] initializeAllDrives failed', err)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // Expose drives IPC
  ipcMain.handle('drives:list', async () => {
    const drives = listActiveDrives().map((d) => ({
      id: d.record.id,
      name: d.record.name,
      publicKeyHex: d.record.publicKeyHex,
      createdAt: d.record.createdAt
    }))
    return drives
  })

  ipcMain.handle('drives:create', async (_evt, name: string) => {
    const d = await createDrive(name)
    return {
      id: d.record.id,
      name: d.record.name,
      publicKeyHex: d.record.publicKeyHex,
      createdAt: d.record.createdAt
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

  // Expose user profile IPC (persisted on disk, separate from Hyperdrive for now)
  ipcMain.handle('user:getProfile', async () => {
    return await readUserProfile()
  })

  ipcMain.handle('user:updateProfile', async (_evt, profile: unknown) => {
    const p = (profile && typeof profile === 'object') ? (profile as Record<string, unknown>) : {}
    await writeUserProfile(p)
    return true
  })

  createWindow()

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
  // Best-effort close of corestores
  closeAllDrives().catch(() => {})
})
