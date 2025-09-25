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


