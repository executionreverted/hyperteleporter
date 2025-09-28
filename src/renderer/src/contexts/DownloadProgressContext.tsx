import React, { createContext, useContext, useState, ReactNode, useEffect, useRef, useCallback } from 'react';

interface DownloadProgressState {
  downloadId: string;
  folderName: string;
  currentFile: string;
  progress: number;
  totalFiles: number;
  downloadedFiles: number;
  downloadPath: string;
  status: 'downloading' | 'completed' | 'failed';
  error?: string;
  shouldShow: boolean;
  startTime: number;
}

interface DownloadProgressContextType {
  downloads: Record<string, DownloadProgressState>;
  startDownload: (folderName: string, totalFiles: number, downloadId: string, downloadPath: string) => void;
  updateProgress: (downloadId: string, currentFile: string, downloadedFiles: number, totalFiles?: number) => void;
  updateDownloadPath: (downloadId: string, downloadPath: string) => void;
  completeDownload: (downloadId: string) => void;
  failDownload: (downloadId: string, error: string) => void;
  removeDownload: (downloadId: string) => void;
  getActiveDownloads: () => DownloadProgressState[];
}

const DownloadProgressContext = createContext<DownloadProgressContextType | undefined>(undefined);

export const useDownloadProgress = () => {
  const context = useContext(DownloadProgressContext);
  if (!context) {
    throw new Error('useDownloadProgress must be used within a DownloadProgressProvider');
  }
  return context;
};

interface DownloadProgressProviderProps {
  children: ReactNode;
}

export const DownloadProgressProvider: React.FC<DownloadProgressProviderProps> = ({ children }) => {
  const [downloads, setDownloads] = useState<Record<string, DownloadProgressState>>({});
  const autoHideTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});

  const startDownload = (folderName: string, totalFiles: number, downloadId: string, downloadPath: string) => {
    const newDownload: DownloadProgressState = {
      downloadId,
      folderName,
      currentFile: '',
      progress: 0,
      totalFiles,
      downloadedFiles: 0,
      downloadPath,
      status: 'downloading',
      shouldShow: true,
      startTime: Date.now(),
    };

    setDownloads(prev => ({
      ...prev,
      [downloadId]: newDownload
    }));
  };

  const updateProgress = (downloadId: string, currentFile: string, downloadedFiles: number, totalFiles?: number) => {
    setDownloads(prev => {
      const download = prev[downloadId];
      if (download) {
        return {
          ...prev,
          [downloadId]: {
            ...download,
            currentFile,
            downloadedFiles,
            totalFiles: totalFiles || download.totalFiles,
            progress: (totalFiles || download.totalFiles) > 0 ? (downloadedFiles / (totalFiles || download.totalFiles)) * 100 : 0,
          }
        };
      }
      return prev;
    });
  };

  const updateDownloadPath = (downloadId: string, downloadPath: string) => {
    setDownloads(prev => {
      const download = prev[downloadId];
      if (download) {
        return {
          ...prev,
          [downloadId]: {
            ...download,
            downloadPath,
          }
        };
      }
      return prev;
    });
  };

  const completeDownload = (downloadId: string) => {
    // Clear any existing timeout for this download
    const existingTimeout = autoHideTimeoutsRef.current[downloadId];
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      delete autoHideTimeoutsRef.current[downloadId];
    }

    setDownloads(prev => {
      const download = prev[downloadId];
      if (download) {
        return {
          ...prev,
          [downloadId]: {
            ...download,
            progress: 100,
            status: 'completed',
            shouldShow: true, // Show completed state briefly
          }
        };
      }
      return prev;
    });

    // Auto-hide after 3 seconds
    const timeout = setTimeout(() => {
      setDownloads(prev => {
        const download = prev[downloadId];
        if (download) {
          return {
            ...prev,
            [downloadId]: {
              ...download,
              shouldShow: false,
            }
          };
        }
        return prev;
      });
      delete autoHideTimeoutsRef.current[downloadId];
    }, 3000);
    
    autoHideTimeoutsRef.current[downloadId] = timeout;
  };

  const failDownload = (downloadId: string, error: string) => {
    // Clear any existing timeout for this download
    const existingTimeout = autoHideTimeoutsRef.current[downloadId];
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      delete autoHideTimeoutsRef.current[downloadId];
    }

    setDownloads(prev => {
      const download = prev[downloadId];
      if (download) {
        return {
          ...prev,
          [downloadId]: {
            ...download,
            status: 'failed',
            error,
            shouldShow: true, // Show failed state briefly
          }
        };
      }
      return prev;
    });

    // Auto-hide failed downloads after 5 seconds (longer for errors)
    const timeout = setTimeout(() => {
      setDownloads(prev => {
        const download = prev[downloadId];
        if (download) {
          return {
            ...prev,
            [downloadId]: {
              ...download,
              shouldShow: false,
            }
          };
        }
        return prev;
      });
      delete autoHideTimeoutsRef.current[downloadId];
    }, 5000);
    
    autoHideTimeoutsRef.current[downloadId] = timeout;
  };

  const removeDownload = (downloadId: string) => {
    // Clear any existing timeout for this download
    const existingTimeout = autoHideTimeoutsRef.current[downloadId];
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      delete autoHideTimeoutsRef.current[downloadId];
    }

    setDownloads(prev => {
      const { [downloadId]: removed, ...rest } = prev;
      return rest;
    });
  };

  const getActiveDownloads = (): DownloadProgressState[] => {
    return Object.values(downloads).filter(download => download.shouldShow);
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(autoHideTimeoutsRef.current).forEach(timeout => clearTimeout(timeout));
      autoHideTimeoutsRef.current = {};
    };
  }, []);

  return (
    <DownloadProgressContext.Provider
      value={{
        downloads,
        startDownload,
        updateProgress,
        updateDownloadPath,
        completeDownload,
        failDownload,
        removeDownload,
        getActiveDownloads,
      }}
    >
      {children}
    </DownloadProgressContext.Provider>
  );
};
