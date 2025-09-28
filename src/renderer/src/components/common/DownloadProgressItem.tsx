import React from 'react';
import { IconDownload, IconCheck, IconX, IconFolderOpen } from '@tabler/icons-react';
import { useDownloadProgress } from '../../contexts/DownloadProgressContext';
import { MagicButton } from './MagicButton';

interface DownloadProgressItemProps {
  onOpenFolder: (path: string) => void;
}

export const DownloadProgressItem: React.FC<DownloadProgressItemProps> = ({ onOpenFolder }) => {
  const { downloadState } = useDownloadProgress();

  console.log('[DownloadProgressItem] State:', downloadState);

  if (!downloadState.isDownloading && downloadState.status === 'downloading') {
    return null;
  }

  const getStatusIcon = () => {
    switch (downloadState.status) {
      case 'downloading':
        return <IconDownload className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'completed':
        return <IconCheck className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <IconX className="w-4 h-4 text-red-500" />;
      default:
        return <IconDownload className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (downloadState.status) {
      case 'downloading':
        return `Downloading ${downloadState.downloadedFiles}/${downloadState.totalFiles} files...`;
      case 'completed':
        return `Downloaded ${downloadState.totalFiles} files`;
      case 'failed':
        return `Download failed: ${downloadState.error}`;
      default:
        return 'Downloading...';
    }
  };

  const getProgressBarColor = () => {
    switch (downloadState.status) {
      case 'downloading':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <h4 className="text-white font-medium">{downloadState.folderName}</h4>
            <p className="text-sm text-neutral-400">{getStatusText()}</p>
          </div>
        </div>
        {downloadState.status === 'completed' && (
          <MagicButton
            onClick={() => {
              console.log('[DownloadProgressItem] Opening folder:', downloadState.downloadPath);
              if (downloadState.downloadPath) {
                onOpenFolder(downloadState.downloadPath);
              } else {
                console.error('[DownloadProgressItem] No download path available');
              }
            }}
            variant="blue"
            className="flex h-8 items-center gap-1"
          >
            <IconFolderOpen className="w-4 h-4 mr-1" />
            Open Folder
          </MagicButton>
        )}
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-neutral-700 rounded-full h-2 mb-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor()}`}
          style={{ width: `${downloadState.progress}%` }}
        />
      </div>

      {/* Progress Text */}
      <div className="flex justify-between text-xs text-neutral-400">
        <span>{Math.round(downloadState.progress)}% complete</span>
        <span>{downloadState.downloadedFiles} / {downloadState.totalFiles} files</span>
      </div>

      {/* Current File */}
      {downloadState.status === 'downloading' && downloadState.currentFile && (
        <div className="mt-2 text-xs text-neutral-500 truncate">
          Currently downloading: {downloadState.currentFile}
        </div>
      )}
    </div>
  );
};
