import React, { createContext, useContext, useState, ReactNode } from 'react';

interface UploadProgressState {
  isUploading: boolean;
  currentFile: string;
  progress: number;
  totalFiles: number;
  uploadedFiles: number;
  folderName?: string;
}

interface UploadProgressContextType {
  uploadState: UploadProgressState;
  startUpload: (totalFiles: number, folderName?: string) => void;
  updateProgress: (currentFile: string, uploadedFiles: number) => void;
  completeUpload: () => void;
  resetUpload: () => void;
}

const UploadProgressContext = createContext<UploadProgressContextType | undefined>(undefined);

export const useUploadProgress = () => {
  const context = useContext(UploadProgressContext);
  if (!context) {
    throw new Error('useUploadProgress must be used within an UploadProgressProvider');
  }
  return context;
};

interface UploadProgressProviderProps {
  children: ReactNode;
}

export const UploadProgressProvider: React.FC<UploadProgressProviderProps> = ({ children }) => {
  const [uploadState, setUploadState] = useState<UploadProgressState>({
    isUploading: false,
    currentFile: '',
    progress: 0,
    totalFiles: 0,
    uploadedFiles: 0,
    folderName: undefined,
  });

  const startUpload = (totalFiles: number, folderName?: string) => {
    setUploadState({
      isUploading: true,
      currentFile: '',
      progress: 0,
      totalFiles,
      uploadedFiles: 0,
      folderName,
    });
  };

  const updateProgress = (currentFile: string, uploadedFiles: number) => {
    setUploadState(prev => ({
      ...prev,
      currentFile,
      uploadedFiles,
      progress: prev.totalFiles > 0 ? (uploadedFiles / prev.totalFiles) * 100 : 0,
    }));
  };

  const completeUpload = () => {
    setUploadState(prev => ({
      ...prev,
      isUploading: false,
      progress: 100,
    }));
  };

  const resetUpload = () => {
    setUploadState({
      isUploading: false,
      currentFile: '',
      progress: 0,
      totalFiles: 0,
      uploadedFiles: 0,
      folderName: undefined,
    });
  };

  return (
    <UploadProgressContext.Provider
      value={{
        uploadState,
        startUpload,
        updateProgress,
        completeUpload,
        resetUpload,
      }}
    >
      {children}
    </UploadProgressContext.Provider>
  );
};
