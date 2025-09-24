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

  // Snapshot the API synchronously so initial refresh can use it
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apiRef = useRef<HyperdriveAPI | null>((window as any)?.api ?? null)

  const refreshProfile = useCallback(async () => {
    try {
      const api = apiRef.current
      if (api?.user?.getProfile) {
        const p = await api.user.getProfile()
        setProfile(p)
      }
    } catch (err) {
      // Swallow for now; can surface to UI later
      // console.error('[HyperdriveContext] refreshProfile failed', err)
    }
  }, [])

  const refreshFiles = useCallback(async () => {
    try {
      const api = apiRef.current
      if (api?.files?.list) {
        const list = await api.files.list('/files')
        setFiles(list)
      }
    } catch (err) {
      // console.error('[HyperdriveContext] refreshFiles failed', err)
    }
  }, [])

  const refreshDrives = useCallback(async () => {
    try {
      const api = apiRef.current
      if (api?.drives?.list) {
        const list = await api.drives.list()
        setDrives(list)
      }
    } catch (err) {
      // console.error('[HyperdriveContext] refreshDrives failed', err)
    }
  }, [])

  const refreshAll = useCallback(async () => {
    await Promise.allSettled([refreshDrives(), refreshProfile(), refreshFiles()])
  }, [refreshDrives, refreshFiles, refreshProfile])

  const updateProfileFn = useCallback(async (next: Profile) => {
    try {
      const api = apiRef.current
      if (api?.user?.updateProfile) {
        await api.user.updateProfile(next)
      }
      setProfile(next)
    } catch (err) {
      // console.error('[HyperdriveContext] updateProfile failed', err)
    }
  }, [])

  const createDriveFn = useCallback(async (name: string) => {
    try {
      const api = apiRef.current
      if (api?.drives?.create) {
        const created = await api.drives.create(name)
        await refreshDrives()
        return created
      }
    } catch (err) {
      // console.error('[HyperdriveContext] createDrive failed', err)
    }
    return null
  }, [refreshDrives])

  useEffect(() => {
    // Initial load with startup delay
    const initTimer = setTimeout(() => {
      refreshAll().finally(() => {
        setLoaded(true)
        setIsInitializing(false)
      })
    }, 3200) // Match startup loader duration

    return () => clearTimeout(initTimer)
  }, [refreshAll])

  const value = useMemo<HyperdriveContextType>(
    () => ({
      loaded,
      isInitializing,
      profile,
      files,
      drives,
      refreshAll,
      refreshProfile,
      refreshFiles,
      updateProfile: updateProfileFn,
      createDrive: createDriveFn
    }),
    [loaded, isInitializing, profile, files, drives, refreshAll, refreshProfile, refreshFiles, updateProfileFn, createDriveFn]
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


