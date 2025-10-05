import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

// App-wide Hyperdrive context modeled after examples in Hyperdrive.md
// This renderer context is transport-agnostic: it calls optional window.api methods
// that we'll wire to IPC later. Until then, it no-ops safely.

type FileEntry = {
  key: string
  // Minimal value shape from docs: executable, linkname, blob, metadata
  value: Record<string, unknown>
}

type Profile = Record<string, unknown>

type DriveSummary = {
  id: string
  name: string
  publicKeyHex: string
  createdAt: string
}

type HyperdriveAPI = {
  drives?: {
    list: () => Promise<DriveSummary[]>
    create: (name: string) => Promise<DriveSummary>
  }
  user?: {
    getProfile: () => Promise<Profile>
    updateProfile: (profile: Profile) => Promise<void>
    hasUsername: () => Promise<boolean>
  }
  files?: {
    list: (folder?: string) => Promise<FileEntry[]>
  }
}

type HyperdriveContextType = {
  loaded: boolean
  isInitializing: boolean
  profile: Profile
  files: FileEntry[]
  drives: DriveSummary[]
  hasUsername: boolean
  refreshAll: () => Promise<void>
  refreshProfile: () => Promise<void>
  refreshFiles: () => Promise<void>
  updateProfile: (profile: Profile) => Promise<void>
  createDrive: (name: string) => Promise<DriveSummary | null>
}

const HyperdriveContext = createContext<HyperdriveContextType | undefined>(undefined)

export function HyperdriveProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState(false)
  const [profile, setProfile] = useState<Profile>({})
  const [files, setFiles] = useState<FileEntry[]>([])
  const [drives, setDrives] = useState<DriveSummary[]>([])
  const [isInitializing, setIsInitializing] = useState(true)
  const [logoReady, setLogoReady] = useState(false)
  const [coreReady, setCoreReady] = useState(false)
  const [hasUsername, setHasUsername] = useState(false)

  // Get API dynamically to ensure it's available when preload is ready
  const getApi = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (window as any)?.api ?? null
  }, [])

  const refreshProfile = useCallback(async () => {
    try {
      const api = getApi()
      if (api?.user?.getProfile && api?.user?.hasUsername) {
        const p = await api.user.getProfile()
        const hasUser = await api.user.hasUsername()
        setProfile(p)
        setHasUsername(hasUser)
      }
    } catch (err) {
      console.error('[HyperdriveContext] refreshProfile failed:', err)
    }
  }, [getApi])

  const refreshFiles = useCallback(async () => {
    try {
      const api = getApi()
      if (api?.files?.list) {
        const list = await api.files.list('/files')
        setFiles(list)
      }
    } catch (err) {
      // console.error('[HyperdriveContext] refreshFiles failed', err)
    }
  }, [getApi])

  const refreshDrives = useCallback(async () => {
    try {
      const api = getApi()
      if (api?.drives?.list) {
        const list = await api.drives.list()
        setDrives(list)
      }
    } catch (err) {
      console.error('[HyperdriveContext] refreshDrives failed:', err)
    }
  }, [getApi])

  const refreshAll = useCallback(async () => {
    await Promise.allSettled([refreshDrives(), refreshProfile(), refreshFiles()])
  }, [refreshDrives, refreshFiles, refreshProfile])

  const updateProfileFn = useCallback(async (next: Profile) => {
    try {
      const api = getApi()
      if (api?.user?.updateProfile) {
        await api.user.updateProfile(next)
      }
      setProfile(next)
      // Update hasUsername state based on the new profile
      const name = (next as any)?.name
      setHasUsername(!!(name && typeof name === 'string' && name.trim().length > 0))
    } catch (err) {
      // console.error('[HyperdriveContext] updateProfile failed', err)
    }
  }, [getApi])

  const createDriveFn = useCallback(async (name: string) => {
    try {
      const api = getApi()
      if (api?.drives?.create) {
        const created = await api.drives.create(name)
        await refreshDrives()
        return created
      }
    } catch (err) {
      // console.error('[HyperdriveContext] createDrive failed', err)
    }
    return null
  }, [getApi, refreshDrives])

  useEffect(() => {
    // Load profile immediately to set hasUsername state for routing
    const loadProfileImmediately = async () => {
      try {
        const api = getApi()
        if (api?.user?.getProfile && api?.user?.hasUsername) {
          const p = await api.user.getProfile()
          const hasUser = await api.user.hasUsername()
          setProfile(p)
          setHasUsername(hasUser)
        }
      } catch (err) {
        console.error('[HyperdriveContext] loadProfileImmediately failed:', err)
      }
    }

    // Load profile immediately, then load everything else with startup delay
    loadProfileImmediately()
    
    // Retry profile loading after a short delay in case API wasn't ready
    const retryTimer = setTimeout(() => {
      loadProfileImmediately()
    }, 100)
    
    const initTimer = setTimeout(() => {
      refreshAll().finally(() => {
        setLoaded(true)
        setCoreReady(true)
      })
    }, 3200) // previous visual duration; readiness gated below

    return () => {
      clearTimeout(initTimer)
      clearTimeout(retryTimer)
    }
  }, [refreshAll, getApi])

  // Wait until both the app core is ready and the logo animation completed
  useEffect(() => {
    if (coreReady && logoReady) {
      setIsInitializing(false)
    }
  }, [coreReady, logoReady])

  // Listen for logo completion from StartupLoader
  useEffect(() => {
    const handler = () => setLogoReady(true)
    window.addEventListener('startup-logo-complete', handler)
    return () => window.removeEventListener('startup-logo-complete', handler)
  }, [])

  const value = useMemo<HyperdriveContextType>(
    () => ({
      loaded,
      isInitializing,
      profile,
      files,
      drives,
      hasUsername,
      refreshAll,
      refreshProfile,
      refreshFiles,
      updateProfile: updateProfileFn,
      createDrive: createDriveFn
    }),
    [loaded, isInitializing, profile, files, drives, hasUsername, refreshAll, refreshProfile, refreshFiles, updateProfileFn, createDriveFn]
  )

  return (
    <HyperdriveContext.Provider value={value}>
      {children}
    </HyperdriveContext.Provider>
  )
}

export function useHyperdrive() {
  const ctx = useContext(HyperdriveContext)
  if (!ctx) throw new Error('useHyperdrive must be used within a HyperdriveProvider')
  return ctx
}


