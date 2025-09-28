import { app } from 'electron'
import { join } from 'path'

export interface AutolaunchSettings {
  enabled: boolean
  minimized: boolean
  hidden: boolean
}

const AUTOLAUNCH_KEY = 'hyperteleporter-autolaunch'

/**
 * Check if the app is set to launch at startup
 */
export function isAutolaunchEnabled(): boolean {
  if (process.platform === 'win32') {
    // For Windows, check the registry or use a more reliable method
    return app.getLoginItemSettings().openAtLogin
  } else if (process.platform === 'darwin') {
    // For macOS
    return app.getLoginItemSettings().openAtLogin
  } else {
    // For Linux, we'll use a simple file-based approach
    // In production, you might want to use systemd or desktop files
    return false // Placeholder for Linux
  }
}

/**
 * Enable autolaunch at startup
 */
export function enableAutolaunch(options: { minimized?: boolean; hidden?: boolean } = {}): boolean {
  try {
    const settings = {
      openAtLogin: true,
      openAsHidden: options.hidden || false,
      path: process.execPath,
      args: options.minimized ? ['--minimized'] : []
    }

    app.setLoginItemSettings(settings)
    console.log('[autolaunch] Enabled autolaunch with settings:', settings)
    return true
  } catch (error) {
    console.error('[autolaunch] Failed to enable autolaunch:', error)
    return false
  }
}

/**
 * Disable autolaunch at startup
 */
export function disableAutolaunch(): boolean {
  try {
    app.setLoginItemSettings({
      openAtLogin: false
    })
    console.log('[autolaunch] Disabled autolaunch')
    return true
  } catch (error) {
    console.error('[autolaunch] Failed to disable autolaunch:', error)
    return false
  }
}

/**
 * Toggle autolaunch setting
 */
export function toggleAutolaunch(options: { minimized?: boolean; hidden?: boolean } = {}): boolean {
  if (isAutolaunchEnabled()) {
    return disableAutolaunch()
  } else {
    return enableAutolaunch(options)
  }
}

/**
 * Get current autolaunch settings
 */
export function getAutolaunchSettings(): AutolaunchSettings {
  const loginItemSettings = app.getLoginItemSettings()
  return {
    enabled: loginItemSettings.openAtLogin,
    minimized: loginItemSettings.wasOpenedAsHidden || false,
    hidden: loginItemSettings.wasOpenedAsHidden || false
  }
}

/**
 * Check if the app was launched at startup (useful for showing welcome dialog)
 */
export function wasLaunchedAtStartup(): boolean {
  const loginItemSettings = app.getLoginItemSettings()
  return loginItemSettings.wasOpenedAtLogin || false
}

