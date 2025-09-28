import { useState, useEffect, useCallback } from 'react'

export interface AutolaunchSettings {
  enabled: boolean
  minimized: boolean
  hidden: boolean
}

export function useAutolaunch() {
  const [isEnabled, setIsEnabled] = useState<boolean>(false)
  const [settings, setSettings] = useState<AutolaunchSettings>({
    enabled: false,
    minimized: false,
    hidden: false
  })
  const [wasLaunchedAtStartup, setWasLaunchedAtStartup] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)

  // Get API dynamically to ensure it's available when preload is ready
  const getApi = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (window as any)?.api ?? null
  }, [])

  // Load initial state
  useEffect(() => {
    const loadInitialState = async () => {
      try {
        const api = getApi()
        if (api?.autolaunch) {
          const [enabled, currentSettings, launchedAtStartup] = await Promise.all([
            api.autolaunch.isEnabled(),
            api.autolaunch.getSettings(),
            api.autolaunch.wasLaunchedAtStartup()
          ])
          
          setIsEnabled(enabled)
          setSettings(currentSettings)
          setWasLaunchedAtStartup(launchedAtStartup)
        }
      } catch (error) {
        console.error('[useAutolaunch] Failed to load initial state:', error)
      } finally {
        setLoading(false)
      }
    }

    loadInitialState()
  }, [getApi])

  const enable = useCallback(async (options: { minimized?: boolean; hidden?: boolean } = {}) => {
    try {
      const api = getApi()
      if (api?.autolaunch) {
        const success = await api.autolaunch.enable(options)
        if (success) {
          setIsEnabled(true)
          const newSettings = await api.autolaunch.getSettings()
          setSettings(newSettings)
        }
        return success
      }
      return false
    } catch (error) {
      console.error('[useAutolaunch] Failed to enable autolaunch:', error)
      return false
    }
  }, [getApi])

  const disable = useCallback(async () => {
    try {
      const api = getApi()
      if (api?.autolaunch) {
        const success = await api.autolaunch.disable()
        if (success) {
          setIsEnabled(false)
          const newSettings = await api.autolaunch.getSettings()
          setSettings(newSettings)
        }
        return success
      }
      return false
    } catch (error) {
      console.error('[useAutolaunch] Failed to disable autolaunch:', error)
      return false
    }
  }, [getApi])

  const toggle = useCallback(async (options: { minimized?: boolean; hidden?: boolean } = {}) => {
    try {
      const api = getApi()
      if (api?.autolaunch) {
        const success = await api.autolaunch.toggle(options)
        if (success) {
          const newSettings = await api.autolaunch.getSettings()
          setIsEnabled(newSettings.enabled)
          setSettings(newSettings)
        }
        return success
      }
      return false
    } catch (error) {
      console.error('[useAutolaunch] Failed to toggle autolaunch:', error)
      return false
    }
  }, [getApi])

  const refresh = useCallback(async () => {
    try {
      const api = getApi()
      if (api?.autolaunch) {
        const [enabled, currentSettings, launchedAtStartup] = await Promise.all([
          api.autolaunch.isEnabled(),
          api.autolaunch.getSettings(),
          api.autolaunch.wasLaunchedAtStartup()
        ])
        
        setIsEnabled(enabled)
        setSettings(currentSettings)
        setWasLaunchedAtStartup(launchedAtStartup)
      }
    } catch (error) {
      console.error('[useAutolaunch] Failed to refresh state:', error)
    }
  }, [getApi])

  return {
    isEnabled,
    settings,
    wasLaunchedAtStartup,
    loading,
    enable,
    disable,
    toggle,
    refresh
  }
}

