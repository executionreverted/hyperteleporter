"use client";
import * as React from "react";
import { TreeNode } from "./tree-view";
import { 
  IconPhoto,
  IconVideo,
  IconFileTypePdf,
  IconFile,
  IconFileText,
  IconFileCode,
  IconFileMusic,
  IconFileZip,
  IconFileSpreadsheet,
  IconPresentation
} from "@tabler/icons-react";

// Image cache to prevent multiple API calls
const imageCache = new Map<string, string>();

// Component for showing image previews as file icons
export const ImagePreviewIcon = React.memo(({ 
  node, 
  driveId, 
  size = 'md' 
}: { 
  node: TreeNode; 
  driveId?: string; 
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'folder';
}) => {
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(false);

  // Size mapping
  const sizeConfig = React.useMemo(() => {
    switch (size) {
      case 'xs':
        return { container: 'w-4 h-4', icon: 12, spinner: 'w-2 h-2' };
      case 'sm':
        return { container: 'w-6 h-6', icon: 20, spinner: 'w-3 h-3' };
      case 'md':
        return { container: 'w-8 h-8', icon: 32, spinner: 'w-4 h-4' };
      case 'lg':
        return { container: 'w-12 h-12', icon: 48, spinner: 'w-6 h-6' };
      case 'xl':
        return { container: 'w-16 h-16', icon: 64, spinner: 'w-8 h-8' };
      case 'folder':
        return { container: 'w-full h-full flex items-center justify-center', icon: 32, spinner: 'w-8 h-8' };
      default:
        return { container: 'w-8 h-8', icon: 32, spinner: 'w-4 h-4' };
    }
  }, [size]);

  const cacheKey = React.useMemo(() => {
    return `${driveId}-${node.id}`;
  }, [driveId, node.id]);

  React.useEffect(() => {
    if (!driveId || imageUrl) return;

    // Check cache first
    const cachedUrl = imageCache.get(cacheKey);
    if (cachedUrl) {
      setImageUrl(cachedUrl);
      return;
    }

    // If already loading, don't start another request
    if (loading) return;

    const loadImagePreview = async () => {
      try {
        setLoading(true);
        setError(false);
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api: any = (window as any)?.api;
        if (!api?.files?.getFileUrl) {
          setError(true);
          return;
        }

        // First, try to download the file if it's not available locally
        if (api?.files?.downloadFile) {
          console.log(`[ImagePreviewIcon] Attempting to download image: ${node.id}`);
          const downloadSuccess = await api.files.downloadFile(driveId, node.id);
          if (downloadSuccess) {
            console.log(`[ImagePreviewIcon] Image downloaded successfully: ${node.id}`);
          } else {
            console.warn(`[ImagePreviewIcon] Image download failed: ${node.id}`);
          }
        }

        const url = await api.files.getFileUrl(driveId, node.id);
        if (url) {
          // Cache the URL
          imageCache.set(cacheKey, url);
          setImageUrl(url);
        } else {
          setError(true);
        }
      } catch (err) {
        console.warn(`[ImagePreviewIcon] Failed to load image preview for ${node.name}:`, err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadImagePreview();
  }, [cacheKey, driveId, loading, imageUrl]);

  // If loading, show loading state
  if (loading) {
    return (
      <div className={`${sizeConfig.container} flex items-center justify-center bg-gray-700 rounded`}>
        <div className={`${sizeConfig.spinner} border-2 border-gray-400 border-t-transparent rounded-full animate-spin`} />
      </div>
    );
  }

  // If error or no image URL, show fallback icon
  if (error || !imageUrl) {
    return <IconPhoto size={sizeConfig.icon} className="text-blue-400" />;
  }

  // Show image preview
  return (
    <div className={`${sizeConfig.container} rounded overflow-hidden bg-gray-800 flex items-center justify-center`}>
      <img
        src={imageUrl}
        alt={node.name}
        className="w-full h-full object-cover"
        onError={() => setError(true)}
      />
    </div>
  );
});

export const FileIcon = ({ node }: { node: TreeNode }) => {
  const getFileType = () => {
    const extension = node.name.split('.').pop()?.toLowerCase();
    return extension || 'unknown';
  };

  const fileType = getFileType();

  const getIconForFileType = () => {
    switch (fileType) {
      case 'jpg': case 'jpeg': case 'png': case 'gif': case 'webp': case 'svg': case 'bmp': case 'ico':
        return <IconPhoto size={32} className="text-blue-400" />;
      case 'mp4': case 'webm': case 'mov': case 'avi': case 'mkv': case 'flv':
        return <IconVideo size={32} className="text-purple-400" />;
      case 'mp3': case 'wav': case 'flac': case 'aac': case 'ogg':
        return <IconFileMusic size={32} className="text-green-400" />;
      case 'pdf':
        return <IconFileTypePdf size={32} className="text-red-400" />;
      case 'doc': case 'docx':
        return <IconFileText size={32} className="text-blue-500" />;
      case 'xls': case 'xlsx': case 'csv':
        return <IconFileSpreadsheet size={32} className="text-green-500" />;
      case 'ppt': case 'pptx':
        return <IconPresentation size={32} className="text-orange-400" />;
      case 'js': case 'jsx': case 'ts': case 'tsx': case 'html': case 'css': case 'scss': case 'sass': case 'less': case 'py': case 'java': case 'cpp': case 'c': case 'cs': case 'php': case 'rb': case 'go': case 'rs': case 'swift': case 'kt': case 'sh': case 'bash': case 'zsh': case 'fish': case 'ps1': case 'bat': case 'cmd':
        return <IconFileCode size={32} className="text-yellow-400" />;
      case 'zip': case 'rar': case '7z': case 'tar': case 'gz': case 'bz2':
        return <IconFileZip size={32} className="text-orange-500" />;
      case 'txt': case 'md': case 'rtf':
        return <IconFileText size={32} className="text-gray-400" />;
      case 'json': case 'xml': case 'yml': case 'yaml': case 'ini': case 'cfg': case 'conf':
        return <IconFileCode size={32} className="text-indigo-400" />;
      default:
        return <IconFile size={32} className="text-neutral-400" />;
    }
  };

  return getIconForFileType();
};


