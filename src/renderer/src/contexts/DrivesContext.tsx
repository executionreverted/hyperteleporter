import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

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
  addDrive: (drive: Omit<Drive, 'id' | 'createdAt'>) => void;
  removeDrive: (id: string) => void;
  updateDrive: (id: string, updates: Partial<Drive>) => void;
  joinReadOnlyDrive: (name: string, publicKeyHex: string) => Promise<Drive | void>;
}

const DrivesContext = createContext<DrivesContextType | undefined>(undefined);

export function DrivesProvider({ children }: { children: ReactNode }) {
  const [drives, setDrives] = useState<Drive[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const api = useMemo(() => (window as any)?.api ?? null, []);

  useEffect(() => {
    let mounted = true;
    
    async function load() {
      try {
        if (api?.drives?.list) {
          console.log('[DrivesContext] Loading drives...');
          const list = await api.drives.list();
          if (!mounted) return;
          console.log('[DrivesContext] Received drives:', list);
          
          const mapped: Drive[] = list.map((d: any) => ({
            id: d.id,
            title: d.name,
            description: '',
            link: `/drive/${d.id}`,
            createdAt: new Date(d.createdAt),
            status: 'active',
            driveKey: d.publicKeyHex,
            type: d.type ?? 'owned',
            isWritable: (d.type ?? 'owned') === 'owned'
          }));
          console.log('[DrivesContext] Mapped drives:', mapped);
          setDrives(mapped);
        }
      } catch (err) {
        console.error('[DrivesContext] Failed to load drives:', err);
      }
    }
    load();
    return () => { mounted = false };
  }, [api]);

  // Listen for drives initialization completion
  useEffect(() => {
    const { ipcRenderer } = (window as any).electron || {};
    if (!ipcRenderer) return;

    const handleDrivesInitialized = () => {
      console.log('[DrivesContext] Received drives:initialized event, refreshing drives...');
      // Force a refresh of drives
      if (api?.drives?.list) {
        api.drives.list().then((list: any) => {
          console.log('[DrivesContext] Refreshed drives after initialization:', list);
          const mapped: Drive[] = list.map((d: any) => ({
            id: d.id,
            title: d.name,
            description: '',
            link: `/drive/${d.id}`,
            createdAt: new Date(d.createdAt),
            status: 'active',
            driveKey: d.publicKeyHex,
            type: d.type ?? 'owned',
            isWritable: (d.type ?? 'owned') === 'owned'
          }));
          console.log('[DrivesContext] Setting drives after initialization:', mapped);
          setDrives(mapped);
        }).catch((err: any) => {
          console.error('[DrivesContext] Failed to refresh drives:', err);
        });
      }
    };

    ipcRenderer.on('drives:initialized', handleDrivesInitialized);
    return () => {
      try {
        ipcRenderer.removeListener('drives:initialized', handleDrivesInitialized);
      } catch {}
    };
  }, [api]);

  const addDrive = async (driveData: Omit<Drive, 'id' | 'createdAt'>) => {
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
  };

  // Join an existing drive by key
  const joinReadOnlyDrive = async (name: string, publicKeyHex: string) => {
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
  }

  const removeDrive = (id: string) => {
    setDrives(prev => prev.filter(drive => drive.id !== id));
  };

  const updateDrive = (id: string, updates: Partial<Drive>) => {
    setDrives(prev => 
      prev.map(drive => 
        drive.id === id ? { ...drive, ...updates } : drive
      )
    );
  };

  return (
    <DrivesContext.Provider value={{ drives, addDrive, removeDrive, updateDrive, joinReadOnlyDrive }}>
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
