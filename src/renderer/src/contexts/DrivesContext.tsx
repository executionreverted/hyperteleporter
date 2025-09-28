import { createContext, useContext, useEffect, useMemo, useState, useCallback, type ReactNode } from 'react';

export interface Drive {
  id: string;
  title: string;
  description: string;
  link: string;
  createdAt: Date;
  size?: string;
  status: 'active' | 'inactive' | 'syncing';
  lastAccessed?: Date;
  driveKey?: string;
  type?: 'owned' | 'readonly';
  isWritable?: boolean;
}

interface DrivesContextType {
  drives: Drive[];
  isLoading: boolean;
  addDrive: (drive: Omit<Drive, 'id' | 'createdAt'>) => void;
  removeDrive: (id: string) => void;
  updateDrive: (id: string, updates: Partial<Drive>) => void;
  joinReadOnlyDrive: (name: string, publicKeyHex: string) => Promise<Drive | void>;
}

const DrivesContext = createContext<DrivesContextType | undefined>(undefined);

export function DrivesProvider({ children }: { children: ReactNode }) {
  const [drives, setDrives] = useState<Drive[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const api = useMemo(() => (window as any)?.api ?? null, []);

  // Helper function to map drive data
  const mapDriveData = useCallback((d: any): Drive => ({
    id: d.id,
    title: d.name,
    description: '',
    link: `/drive/${d.id}`,
    createdAt: new Date(d.createdAt),
    status: 'active',
    driveKey: d.publicKeyHex,
    type: d.type ?? 'owned',
    isWritable: (d.type ?? 'owned') === 'owned'
  }), []);

  // Load drives function
  const loadDrives = useCallback(async () => {
    try {
      if (api?.drives?.list) {
        const list = await api.drives.list();
        const mapped: Drive[] = list.map(mapDriveData);
        setDrives(mapped);
        setIsLoading(false);
      }
    } catch (err) {
      console.error('[DrivesContext] Failed to load drives:', err);
      setIsLoading(false);
    }
  }, [api, mapDriveData]);

  useEffect(() => {
    let mounted = true;
    
    loadDrives().then(() => {
      if (!mounted) return;
    });
    
    return () => { mounted = false };
  }, [loadDrives]);

  // Listen for drives initialization completion
  useEffect(() => {
    const { ipcRenderer } = (window as any).electron || {};
    if (!ipcRenderer) return;

    const handleDrivesInitialized = () => {
      loadDrives();
    };

    ipcRenderer.on('drives:initialized', handleDrivesInitialized);
    return () => {
      try {
        ipcRenderer.removeListener('drives:initialized', handleDrivesInitialized);
      } catch {}
    };
  }, [loadDrives]);

  const addDrive = useCallback(async (driveData: Omit<Drive, 'id' | 'createdAt'>) => {
    try {
      if (api?.drives?.create) {
        const created = await api.drives.create(driveData.title);
        const newDrive: Drive = {
          ...driveData,
          id: created.id,
          createdAt: new Date(created.createdAt),
          driveKey: created.publicKeyHex,
          link: `/drive/${created.id}`,
          type: created.type ?? 'owned',
          isWritable: (created.type ?? 'owned') === 'owned'
        };
        setDrives(prev => [...prev, newDrive]);
        return;
      }
    } catch {}
    // Fallback local add if API missing
    const fallback: Drive = { ...driveData, id: Date.now().toString(), createdAt: new Date() };
    setDrives(prev => [...prev, fallback]);
  }, [api]);

  // Join an existing drive by key
  const joinReadOnlyDrive = useCallback(async (name: string, publicKeyHex: string) => {
    if (!api?.drives?.join) return
    const created = await api.drives.join(name, publicKeyHex)
    const newDrive: Drive = {
      id: created.id,
      title: created.name,
      description: '',
      link: `/drive/${created.id}`,
      createdAt: new Date(created.createdAt),
      status: 'active',
      driveKey: created.publicKeyHex,
      type: created.type ?? 'readonly',
      isWritable: false
    }
    setDrives(prev => [...prev, newDrive])
    return newDrive
  }, [api]);

  const removeDrive = useCallback((id: string) => {
    setDrives(prev => prev.filter(drive => drive.id !== id));
  }, []);

  const updateDrive = useCallback((id: string, updates: Partial<Drive>) => {
    setDrives(prev => 
      prev.map(drive => 
        drive.id === id ? { ...drive, ...updates } : drive
      )
    );
  }, []);

  const contextValue = useMemo(() => ({
    drives,
    isLoading,
    addDrive,
    removeDrive,
    updateDrive,
    joinReadOnlyDrive
  }), [drives, isLoading, addDrive, removeDrive, updateDrive, joinReadOnlyDrive]);

  return (
    <DrivesContext.Provider value={contextValue}>
      {children}
    </DrivesContext.Provider>
  );
}

export function useDrives() {
  const context = useContext(DrivesContext);
  if (context === undefined) {
    throw new Error('useDrives must be used within a DrivesProvider');
  }
  return context;
}
