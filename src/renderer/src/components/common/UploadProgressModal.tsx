import React from 'react';
import { MultiStepLoader } from '../../../../components/ui/multi-step-loader';
import { useUploadProgress } from '../../contexts/UploadProgressContext';

export const UploadProgressModal: React.FC = () => {
  const { uploadState, resetUpload } = useUploadProgress();

  const loadingStates = React.useMemo(() => {
    if (uploadState.folderName) {
      return [
        { text: `Preparing folder "${uploadState.folderName}"...` },
        { text: `Uploading files (${uploadState.uploadedFiles}/${uploadState.totalFiles})...` },
        { text: uploadState.currentFile ? `Uploading: ${uploadState.currentFile}` : 'Processing files...' },
        { text: 'Finalizing upload...' },
        { text: 'Upload complete!' },
      ];
    } else {
      return [
        { text: `Preparing ${uploadState.totalFiles} files...` },
        { text: `Uploading files (${uploadState.uploadedFiles}/${uploadState.totalFiles})...` },
        { text: uploadState.currentFile ? `Uploading: ${uploadState.currentFile}` : 'Processing files...' },
        { text: 'Finalizing upload...' },
        { text: 'Upload complete!' },
      ];
    }
  }, [uploadState.folderName, uploadState.totalFiles, uploadState.uploadedFiles, uploadState.currentFile]);

  // Calculate current step based on progress
  const currentStep = React.useMemo(() => {
    if (!uploadState.isUploading) return 0;
    
    if (uploadState.uploadedFiles === 0) return 0; // Preparing
    if (uploadState.uploadedFiles < uploadState.totalFiles) return 1; // Uploading
    if (uploadState.uploadedFiles === uploadState.totalFiles && uploadState.currentFile) return 2; // Current file
    if (uploadState.uploadedFiles === uploadState.totalFiles && !uploadState.currentFile) return 3; // Finalizing
    return 4; // Complete
  }, [uploadState.isUploading, uploadState.uploadedFiles, uploadState.totalFiles, uploadState.currentFile]);

  React.useEffect(() => {
    if (uploadState.isUploading && uploadState.progress === 100) {
      // Auto-hide after completion
      const timer = setTimeout(() => {
        resetUpload();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [uploadState.isUploading, uploadState.progress, resetUpload]);

  return (
    <MultiStepLoader
      loadingStates={loadingStates}
      loading={uploadState.isUploading}
      duration={1000}
      loop={false}
      currentStep={currentStep}
    />
  );
};
