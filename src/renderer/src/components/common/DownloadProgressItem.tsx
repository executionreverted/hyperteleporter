import React, { useMemo, useCallback } from 'react';
import { IconDownload, IconCheck, IconX, IconFolderOpen } from '@tabler/icons-react';
import { MagicButton } from './MagicButton';

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

interface DownloadProgressItemProps {
  download: DownloadProgressState;
  onOpenFolder: (path: string) => void;
}

export const DownloadProgressItem: React.FC<DownloadProgressItemProps> = ({ download, onOpenFolder }) => {
  const statusIcon = useMemo(() => {
    switch (download.status) {
      case 'downloading':
        return <IconDownload className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'completed':
        return <IconCheck className="w-4 h-4 text-green-500 animate-bounce" />;
      case 'failed':
        return <IconX className="w-4 h-4 text-red-500" />;
      default:
        return <IconDownload className="w-4 h-4 text-gray-500" />;
    }
  }, [download.status]);

  const statusText = useMemo(() => {
    switch (download.status) {
      case 'downloading':
        return `Downloading ${download.downloadedFiles}/${download.totalFiles} files...`;
      case 'completed':
        return `✅ Successfully downloaded ${download.totalFiles} files!`;
      case 'failed':
        return `❌ Download failed: ${download.error}`;
      default:
        return 'Downloading...';
    }
  }, [download.status, download.downloadedFiles, download.totalFiles, download.error]);

  const progressBarColor = useMemo(() => {
    switch (download.status) {
      case 'downloading':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  }, [download.status]);

  const progressPercentage = useMemo(() => {
    if (download.status === 'completed') return 100;
    return Math.round(download.progress);
  }, [download.progress, download.status]);

  const handleOpenFolder = useCallback(() => {
    if (download.downloadPath) {
      onOpenFolder(download.downloadPath);
    }
  }, [download.downloadPath, onOpenFolder]);

  return (
    <div className={`bg-neutral-800/50 border rounded-lg p-4 mb-4 transition-all duration-500 ${
      download.status === 'completed' 
        ? 'border-green-500/50 shadow-lg shadow-green-500/20' 
        : download.status === 'failed'
        ? 'border-red-500/50 shadow-lg shadow-red-500/20'
        : 'border-neutral-700'
    } ${
      download.shouldShow ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          {statusIcon}
          <div>
            <h3 className="text-sm font-medium text-white">
              {download.folderName}
            </h3>
            <p className="text-xs text-neutral-400">
              {statusText}
            </p>
          </div>
        </div>
        
        {download.status === 'completed' && download.downloadPath && (
          <MagicButton
            onClick={handleOpenFolder}
            className="h-8 text-xs"
          >
            <IconFolderOpen className="w-3 h-3 mr-1" />
            <span>Open Folder</span>
          </MagicButton>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs text-neutral-400">
          <span>Progress</span>
          <span>{progressPercentage}%</span>
        </div>
        
        <div className="w-full bg-neutral-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${progressBarColor}`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {download.status === 'downloading' && download.currentFile && (
        <div className="mt-2 text-xs text-neutral-500 truncate">
          Currently downloading: {download.currentFile}
        </div>
      )}
    </div>
  );
};