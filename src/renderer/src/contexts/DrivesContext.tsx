import { createContext, useContext, useState, type ReactNode } from 'react';

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
    {
      id: "1",
      title: "Project Files",
      description: "All my development projects and code repositories",
      link: "/drive/1",
      createdAt: new Date('2024-01-15'),
      size: "2.3 GB",
      status: "active",
      lastAccessed: new Date('2024-01-20'),
      driveKey: "proj_abc123xyz"
    },
    {
      id: "2", 
      title: "Design Assets",
      description: "UI/UX designs, mockups, and creative assets",
      link: "/drive/2",
      createdAt: new Date('2024-01-10'),
      size: "1.8 GB",
      status: "syncing",
      lastAccessed: new Date('2024-01-19'),
      driveKey: "design_def456uvw"
    },
    {
      id: "3",
      title: "Documents",
      description: "Important documents, contracts, and paperwork",
      link: "/drive/3", 
      createdAt: new Date('2024-01-05'),
      size: "450 MB",
      status: "active",
      lastAccessed: new Date('2024-01-18'),
      driveKey: "docs_ghi789rst"
    },
    {
      id: "4",
      title: "Media Library",
      description: "Photos, videos, and multimedia content",
      link: "/drive/4",
      createdAt: new Date('2024-01-01'),
      size: "5.2 GB", 
      status: "inactive",
      lastAccessed: new Date('2024-01-15'),
      driveKey: "media_jkl012mno"
    },
    {
      id: "5",
      title: "Backup Archive",
      description: "System backups and archived data from previous years",
      link: "/drive/5",
      createdAt: new Date('2023-12-20'),
      size: "12.7 GB",
      status: "active",
      lastAccessed: new Date('2024-01-22'),
      driveKey: "backup_pqr345stu"
    },
    {
      id: "6",
      title: "Client Work",
      description: "All client projects, deliverables, and communication files",
      link: "/drive/6",
      createdAt: new Date('2024-01-12'),
      size: "3.1 GB",
      status: "syncing",
      lastAccessed: new Date('2024-01-21'),
      driveKey: "client_vwx678yza"
    },
    {
      id: "7",
      title: "Personal Photos",
      description: "Family photos, vacations, and personal memories",
      link: "/drive/7",
      createdAt: new Date('2023-11-15'),
      size: "8.9 GB",
      status: "active",
      lastAccessed: new Date('2024-01-19'),
      driveKey: "photos_bcd901efg"
    },
    {
      id: "8",
      title: "Music Collection",
      description: "Personal music library with various genres and artists",
      link: "/drive/8",
      createdAt: new Date('2023-10-30'),
      size: "15.4 GB",
      status: "inactive",
      lastAccessed: new Date('2024-01-10'),
      driveKey: "music_hij234klm"
    },
    {
      id: "9",
      title: "Software Tools",
      description: "Development tools, utilities, and software installations",
      link: "/drive/9",
      createdAt: new Date('2024-01-08'),
      size: "4.2 GB",
      status: "active",
      lastAccessed: new Date('2024-01-23'),
      driveKey: "tools_nop567qrs"
    },
    {
      id: "10",
      title: "Research Papers",
      description: "Academic papers, research documents, and study materials",
      link: "/drive/10",
      createdAt: new Date('2023-12-05'),
      size: "1.2 GB",
      status: "active",
      lastAccessed: new Date('2024-01-17'),
      driveKey: "research_tuv890wxy"
    },
    {
      id: "11",
      title: "Game Saves",
      description: "Game save files, mods, and gaming-related content",
      link: "/drive/11",
      createdAt: new Date('2023-09-20'),
      size: "2.8 GB",
      status: "inactive",
      lastAccessed: new Date('2024-01-05'),
      driveKey: "games_zab123cde"
    },
    {
      id: "12",
      title: "Templates",
      description: "Document templates, email templates, and reusable assets",
      link: "/drive/12",
      createdAt: new Date('2024-01-03'),
      size: "650 MB",
      status: "active",
      lastAccessed: new Date('2024-01-24'),
      driveKey: "templates_fgh456ijk"
    },
    {
      id: "13",
      title: "Financial Records",
      description: "Tax documents, invoices, receipts, and financial statements",
      link: "/drive/13",
      createdAt: new Date('2023-08-15'),
      size: "1.9 GB",
      status: "active",
      lastAccessed: new Date('2024-01-16'),
      driveKey: "finance_lmn789opq"
    },
    {
      id: "14",
      title: "Learning Resources",
      description: "Online courses, tutorials, and educational materials",
      link: "/drive/14",
      createdAt: new Date('2023-07-10'),
      size: "6.7 GB",
      status: "syncing",
      lastAccessed: new Date('2024-01-20'),
      driveKey: "learning_rst012uvw"
    }
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
