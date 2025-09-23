import { createContext, useContext, useState, type ReactNode } from 'react';

export interface Drive {
  id: string;
  title: string;
  description: string;
  link: string;
  createdAt: Date;
  size?: string;
  status: 'active' | 'inactive' | 'syncing';
}

interface DrivesContextType {
  drives: Drive[];
  addDrive: (drive: Omit<Drive, 'id' | 'createdAt'>) => void;
  removeDrive: (id: string) => void;
  updateDrive: (id: string, updates: Partial<Drive>) => void;
}

const DrivesContext = createContext<DrivesContextType | undefined>(undefined);

export function DrivesProvider({ children }: { children: ReactNode }) {
  const [drives, setDrives] = useState<Drive[]>([
    
  ]);

  const addDrive = (driveData: Omit<Drive, 'id' | 'createdAt'>) => {
    const newDrive: Drive = {
      ...driveData,
      id: Date.now().toString(),
      createdAt: new Date(),
    };
    setDrives(prev => [...prev, newDrive]);
  };

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
    <DrivesContext.Provider value={{ drives, addDrive, removeDrive, updateDrive }}>
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
