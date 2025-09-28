import React, { createContext, useContext, useState, ReactNode } from 'react';

interface DownloadProgressState {
  isDownloading: boolean;
  currentFile: string;
  progress: number;
  totalFiles: number;
  downloadedFiles: number;
  folderName: string;
  downloadId: string;
  downloadPath: string;
  status: 'downloading' | 'completed' | 'failed';
  error?: string;
}

interface DownloadProgressContextType {
  downloadState: DownloadProgressState;
  startDownload: (folderName: string, totalFiles: number, downloadId: string, downloadPath: string) => void;
  updateProgress: (currentFile: string, downloadedFiles: number, totalFiles?: number) => void;
  updateDownloadPath: (downloadPath: string) => void;
  completeDownload: (downloadId: string) => void;
  failDownload: (downloadId: string, error: string) => void;
  resetDownload: () => void;
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
  const [downloadState, setDownloadState] = useState<DownloadProgressState>({
    isDownloading: false,
    currentFile: '',
    progress: 0,
    totalFiles: 0,
    downloadedFiles: 0,
    folderName: '',
    downloadId: '',
    downloadPath: '',
    status: 'downloading',
  });

  const startDownload = (folderName: string, totalFiles: number, downloadId: string, downloadPath: string) => {
    setDownloadState({
      isDownloading: true,
      currentFile: '',
      progress: 0,
      totalFiles,
      downloadedFiles: 0,
      folderName,
      downloadId,
      downloadPath,
      status: 'downloading',
    });
  };

  const updateProgress = (currentFile: string, downloadedFiles: number, totalFiles?: number) => {
    setDownloadState(prev => ({
      ...prev,
      currentFile,
      downloadedFiles,
      totalFiles: totalFiles || prev.totalFiles,
      progress: (totalFiles || prev.totalFiles) > 0 ? (downloadedFiles / (totalFiles || prev.totalFiles)) * 100 : 0,
    }));
  };

  const updateDownloadPath = (downloadPath: string) => {
    setDownloadState(prev => ({
      ...prev,
      downloadPath,
    }));
  };

  const completeDownload = (downloadId: string) => {
    setDownloadState(prev => ({
      ...prev,
      isDownloading: false,
      progress: 100,
      status: 'completed',
    }));
  };

  const failDownload = (downloadId: string, error: string) => {
    setDownloadState(prev => ({
      ...prev,
      isDownloading: false,
      status: 'failed',
      error,
    }));
  };

  const resetDownload = () => {
    setDownloadState({
      isDownloading: false,
      currentFile: '',
      progress: 0,
      totalFiles: 0,
      downloadedFiles: 0,
      folderName: '',
      downloadId: '',
      downloadPath: '',
      status: 'downloading',
    });
  };

  return (
    <DownloadProgressContext.Provider
      value={{
        downloadState,
        startDownload,
        updateProgress,
        updateDownloadPath,
        completeDownload,
        failDownload,
        resetDownload,
      }}
    >
      {children}
    </DownloadProgressContext.Provider>
  );
};
