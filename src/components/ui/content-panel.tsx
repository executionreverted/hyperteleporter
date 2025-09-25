"use client";
import { cn } from "../../renderer/lib/utils";
import * as React from "react";
import { TreeNode } from "./tree-view";
import { motion } from "motion/react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { MagicButton } from "../../renderer/src/components/common/MagicButton";
import { 
  IconPhoto, 
  IconVideo, 
  IconFileTypePdf, 
  IconFile, 
  IconDownload, 
  IconShare, 
  IconTrash,
  IconEye,
  IconCopy,
  IconFolderPlus,
  IconArrowUp,
  IconFileText,
  IconFileCode,
  IconFileMusic,
  IconFileZip,
  IconFileSpreadsheet,
  IconPresentation
} from "@tabler/icons-react";
import FolderIcon from "../../renderer/src/assets/folder.svg";
import FolderOpenIcon from "../../renderer/src/assets/folder-open.svg";
import { ContextMenu, useContextMenu, type ContextMenuAction } from "./context-menu";
import GlareHover from "./glare-hover";

interface ContentPanelProps {
  selectedNode?: TreeNode;
  onFileClick?: (node: TreeNode) => void;
  onNavigateUp?: () => void;
  canNavigateUp?: boolean;
  driveId?: string;
  onFileDeleted?: () => void;
  onCreateFolder?: (parentPath: string) => void;
  onRefresh?: () => void;
  className?: string;
}

const FileIcon = ({ node }: { node: TreeNode }) => {
  const getFileType = () => {
    const extension = node.name.split('.').pop()?.toLowerCase();
    return extension || 'unknown';
  };

  const fileType = getFileType();

  const getIconForFileType = () => {
    switch (fileType) {
      // Images
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
      case 'svg':
      case 'bmp':
      case 'ico':
        return <IconPhoto size={32} className="text-blue-400" />;
      
      // Videos
      case 'mp4':
      case 'webm':
      case 'mov':
      case 'avi':
      case 'mkv':
      case 'flv':
        return <IconVideo size={32} className="text-purple-400" />;
      
      // Audio
      case 'mp3':
      case 'wav':
      case 'flac':
      case 'aac':
      case 'ogg':
        return <IconFileMusic size={32} className="text-green-400" />;
      
      // Documents
      case 'pdf':
        return <IconFileTypePdf size={32} className="text-red-400" />;
      
      case 'doc':
      case 'docx':
        return <IconFileText size={32} className="text-blue-500" />;
      
      case 'xls':
      case 'xlsx':
      case 'csv':
        return <IconFileSpreadsheet size={32} className="text-green-500" />;
      
      case 'ppt':
      case 'pptx':
        return <IconPresentation size={32} className="text-orange-400" />;
      
      // Code files
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
      case 'html':
      case 'css':
      case 'scss':
      case 'sass':
      case 'less':
      case 'py':
      case 'java':
      case 'cpp':
      case 'c':
      case 'cs':
      case 'php':
      case 'rb':
      case 'go':
      case 'rs':
      case 'swift':
      case 'kt':
      case 'sh':
      case 'bash':
      case 'zsh':
      case 'fish':
      case 'ps1':
      case 'bat':
      case 'cmd':
        return <IconFileCode size={32} className="text-yellow-400" />;
      
      // Archives
      case 'zip':
      case 'rar':
      case '7z':
      case 'tar':
      case 'gz':
      case 'bz2':
        return <IconFileZip size={32} className="text-orange-500" />;
      
      // Text files
      case 'txt':
      case 'md':
      case 'rtf':
        return <IconFileText size={32} className="text-gray-400" />;
      
      // JSON and config files
      case 'json':
      case 'xml':
      case 'yml':
      case 'yaml':
      case 'ini':
      case 'cfg':
      case 'conf':
        return <IconFileCode size={32} className="text-indigo-400" />;
      
      default:
        return <IconFile size={32} className="text-neutral-400" />;
    }
  };

  return getIconForFileType();
};

const FilePreview = ({ node }: { node: TreeNode }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const api: any = (window as any)?.api
  const [imgUrl, setImgUrl] = React.useState<string | null>(null)
  const [loadingImg, setLoadingImg] = React.useState(false)
  const [imgError, setImgError] = React.useState<string | null>(null)
  
  // Code preview hooks - moved to top level to avoid conditional hook calls
  const [code, setCode] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const getFileType = () => {
    const extension = node.name.split('.').pop()?.toLowerCase();
    return extension || 'unknown';
  };

  const fileType = getFileType();

  // Load code content when node changes and it's a code file
  React.useEffect(() => {
    const codeExtensions = ['json', 'js', 'jsx', 'ts', 'tsx', 'html', 'css', 'yml', 'yaml', 'xml', 'py', 'sh', 'sql'];
    if (codeExtensions.includes(fileType)) {
      (async () => {
        try {
          setLoading(true)
          setError(null)
          const match = window.location.hash.match(/#\/drive\/([^/]+)/)
          const driveId = match ? match[1] : null
          if (!driveId || !api?.files?.getFileText) {
            setError('Preview not available')
            return
          }
          const path = node.id.startsWith('/') ? node.id : `/${node.id}`
          const text = await api.files.getFileText(driveId, path)
          setCode(text)
        } catch (e: any) {
          setError(String(e?.message || e))
        } finally {
          setLoading(false)
        }
      })()
    } else {
      // Reset code state for non-code files
      setCode(null)
      setLoading(false)
      setError(null)
    }
  }, [node.id, fileType, api])

  const inferLanguage = (ext: string): string => {
    switch (ext) {
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'json':
        return 'json';
      case 'html':
        return 'markup';
      case 'css':
        return 'css';
      case 'md':
        return 'markdown';
      case 'yml':
      case 'yaml':
        return 'yaml';
      case 'xml':
        return 'markup';
      case 'py':
        return 'python';
      case 'sh':
        return 'bash';
      case 'sql':
        return 'sql';
      default:
        return 'text';
    }
  };

  const renderCodePreview = (ext: string) => {
    const language = inferLanguage(ext);
    return (
      <div className="p-6">
        <div className="bg-black/10 rounded-lg p-4 max-h-[480px] overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-neutral-800">
          <div className="text-white mb-3">Code Preview:</div>
          {loading && <div className="text-neutral-300">Loading…</div>}
          {error && <div className="text-red-400">{error}</div>}
          {code && (
            <SyntaxHighlighter
              language={language}
              style={vscDarkPlus}
              customStyle={{ background: 'transparent', margin: 0, padding: '1rem', borderRadius: '0.5rem' }}
              wrapLongLines
            >
              {code}
            </SyntaxHighlighter>
          )}
        </div>
      </div>
    );
  };

  const renderPreview = () => {
    switch (fileType) {
      case 'txt':
      case 'md':
        return (
          <MarkdownPreview node={node} />
        );

      case 'json':
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
      case 'html':
      case 'css':
      case 'yml':
      case 'yaml':
      case 'xml':
      case 'py':
      case 'sh':
      case 'sql':
        return renderCodePreview(fileType);

      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return (
          <div className="p-6">
            <div className="bg-gray-100 dark:bg-black/10 rounded-lg p-4 max-h-[480px] overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-neutral-800">
              <div className="text-white mb-4">Image Preview:</div>
              <div className="bg-white dark:bg-neutral-700 rounded-lg p-4 flex items-center justify-center max-h-[400px] min-h-[200px]">
                {loadingImg && (
                  <div className="text-sm text-neutral-300">Loading image…</div>
                )}
                {imgError && (
                  <div className="text-sm text-red-400">{imgError}</div>
                )}
                {imgUrl && !loadingImg && !imgError && (
                  <img src={imgUrl} alt={node.name} className="max-h-[360px] object-contain" />
                )}
              </div>
            </div>
          </div>
        );

      case 'mp4':
      case 'webm':
      case 'mov':
        return (
          <MediaPreview node={node} type="video" />
        );

      case 'pdf':
        return (
          <div className="p-6">
            <div className="bg-gray-100 dark:bg-black/10 rounded-lg p-4 max-h-[480px] overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-neutral-800">
              <div className="text-white mb-4">PDF Preview:</div>
              <div className="bg-white dark:bg-neutral-700 rounded-lg p-8 flex items-center justify-center max-h-[400px]">
                <div className="text-center">
                  <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-lg mx-auto mb-4 flex items-center justify-center">
                    <IconFileTypePdf size={32} className="text-red-500" />
                  </div>
                  <p className="text-sm text-white">PDF preview would appear here</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'mp3':
      case 'wav':
      case 'ogg':
        return (
          <MediaPreview node={node} type="audio" />
        );

      default:
        return <TextPreview node={node} />;
    }
  };

  React.useEffect(() => {
    const imageTypes = ['jpg','jpeg','png','gif','webp']
    const ext = node.name.split('.').pop()?.toLowerCase() || ''
    if (!imageTypes.includes(ext)) return
    // Derive driveId and path from node.id
    // node.id holds the absolute path ("/foo/bar.png"). We need driveId from URL param, so read from location hash/hash router.
    try {
      const match = window.location.hash.match(/#\/drive\/([^/]+)/)
      const driveId = match ? match[1] : null
      if (!driveId || !api?.files?.getFileUrl) return
      setLoadingImg(true)
      setImgError(null)
      const path = node.id.startsWith('/') ? node.id : `/${node.id}`
      Promise.resolve(api.files.getFileUrl(driveId, path))
        .then((url: string | null) => {
          if (!url) throw new Error('No data')
          setImgUrl(url)
        })
        .catch((e: any) => setImgError(String(e?.message || e)))
        .finally(() => setLoadingImg(false))
    } catch {}
  }, [node.id, node.name, api])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
    >
      {renderPreview()}
    </motion.div>
  );
};

function MarkdownPreview({ node }: { node: TreeNode }) {
  const [content, setContent] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const api: any = (window as any)?.api

  React.useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        setError(null)
        const match = window.location.hash.match(/#\/drive\/([^/]+)/)
        const driveId = match ? match[1] : null
        if (!driveId || !api?.files?.getFileText) {
          setError('Preview not available')
          return
        }
        const path = node.id.startsWith('/') ? node.id : `/${node.id}`
        const text = await api.files.getFileText(driveId, path)
        if (!text) throw new Error('Empty')
        setContent(text)
      } catch (e: any) {
        setError(String(e?.message || e))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [node.id])

  if (loading) return <div className="p-6 text-neutral-300">Loading…</div>
  if (error) return <div className="p-6 text-red-400">{error}</div>
  if (!content) return null

  return (
    <div className="p-6">
      <div className="bg-black/10 rounded-lg p-4 max-h-[480px] overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-neutral-800">
        <div className="text-white mb-3">Markdown Preview:</div>
        <SyntaxHighlighter
          language={'markdown'}
          style={vscDarkPlus}
          customStyle={{ background: 'transparent', margin: 0, padding: '1rem', borderRadius: '0.5rem' }}
          wrapLongLines
        >
          {content}
        </SyntaxHighlighter>
      </div>
    </div>
  )
}

function TextPreview({ node }: { node: TreeNode }) {
  const [content, setContent] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const api: any = (window as any)?.api

  React.useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        setError(null)
        const match = window.location.hash.match(/#\/drive\/([^/]+)/)
        const driveId = match ? match[1] : null
        if (!driveId || !api?.files?.getFileText) {
          setError('Preview not available')
          return
        }
        const path = node.id.startsWith('/') ? node.id : `/${node.id}`
        const text = await api.files.getFileText(driveId, path)
        if (!text) throw new Error('Empty')
        setContent(text)
      } catch (e: any) {
        setError(String(e?.message || e))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [node.id])

  if (loading) return <div className="p-6 text-neutral-300">Loading…</div>
  if (error) return <div className="p-6 text-red-400">{error}</div>
  if (!content) return null

  return (
    <div className="p-6">
      <div className="bg-black/10 rounded-lg p-4 max-h-[480px] overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-neutral-800">
        <div className="text-white mb-3">Text Preview:</div>
        <SyntaxHighlighter
          language={'text'}
          style={vscDarkPlus}
          customStyle={{ background: 'transparent', margin: 0, padding: '1rem', borderRadius: '0.5rem' }}
          wrapLongLines
        >
          {content}
        </SyntaxHighlighter>
      </div>
    </div>
  )
}

function MediaPreview({ node, type }: { node: TreeNode; type: 'audio' | 'video' }) {
  const [url, setUrl] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const api: any = (window as any)?.api

  React.useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        setError(null)
        const match = window.location.hash.match(/#\/drive\/([^/]+)/)
        const driveId = match ? match[1] : null
        if (!driveId || !api?.files?.getFileUrl) {
          setError('Preview not available')
          return
        }
        const path = node.id.startsWith('/') ? node.id : `/${node.id}`
        console.log(`[MediaPreview] Loading ${type} file: ${node.name} (${path})`)
        const blobUrl = await api.files.getFileUrl(driveId, path)
        if (!blobUrl) throw new Error('Empty')
        console.log(`[MediaPreview] Created blob URL for ${node.name}: ${blobUrl}`)
        setUrl(blobUrl)
      } catch (e: any) {
        console.error(`[MediaPreview] Error loading ${node.name}:`, e)
        setError(String(e?.message || e))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [node.id, type, node.name])

  if (loading) return <div className="p-6 text-neutral-300">Loading…</div>
  if (error) return <div className="p-6 text-red-400">{error}</div>
  if (!url) return null

  return (
    <div className="p-6">
      <div className="bg-black/10 rounded-lg p-4">
        {type === 'video' ? (
          <video 
            src={url} 
            controls 
            className="max-h-[420px] w-full rounded-md"
            onError={(e) => console.error(`[MediaPreview] Video error for ${node.name}:`, e)}
            onLoadStart={() => console.log(`[MediaPreview] Video load started for ${node.name}`)}
          />
        ) : (
          <audio 
            src={url} 
            controls 
            className="w-full"
            onError={(e) => console.error(`[MediaPreview] Audio error for ${node.name}:`, e)}
            onLoadStart={() => console.log(`[MediaPreview] Audio load started for ${node.name}`)}
            onCanPlay={() => console.log(`[MediaPreview] Audio can play for ${node.name}`)}
            onCanPlayThrough={() => console.log(`[MediaPreview] Audio can play through for ${node.name}`)}
          />
        )}
      </div>
    </div>
  )
}

const FileMetadata = ({ node }: { node: TreeNode }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="p-6"
    >
      <div className="bg-black/10 rounded-lg p-8 h-full">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white mb-4">
            File Information
          </h3>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-neutral-400">Name:</span>
            <span className="text-white font-medium">{node.name}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-neutral-400">Type:</span>
            <span className="text-white font-medium">
              {node.type === 'folder' ? 'Folder' : 'File'}
            </span>
          </div>
          
          {node.size && (
            <div className="flex justify-between">
              <span className="text-neutral-400">Size:</span>
              <span className="text-white font-medium">{node.size}</span>
            </div>
          )}
          
          {node.modified && (
            <div className="flex justify-between">
              <span className="text-neutral-400">Modified:</span>
              <span className="text-white font-medium">{node.modified}</span>
            </div>
          )}
          
          <div className="flex justify-between">
            <span className="text-neutral-400">Created:</span>
            <span className="text-white font-medium">
              {new Date().toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const FolderContents = ({ node, onFileClick, onNavigateUp, canNavigateUp, driveId, onFileDeleted }: { node: TreeNode; onFileClick?: (node: TreeNode) => void; onNavigateUp?: () => void; canNavigateUp?: boolean; driveId?: string; onFileDeleted?: () => void }) => {
  const totalItems = node.children ? node.children.length : 0;
  const folderCount = node.children ? node.children.filter(c => c.type === 'folder').length : 0;
  const fileCount = totalItems - folderCount;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const api: any = (window as any)?.api
  const { isOpen, position, actions, openContextMenu, closeContextMenu } = useContextMenu()

  const handleDeleteFile = async (fileNode: TreeNode) => {
    if (fileNode.type !== 'file') return
    
    const confirmed = window.confirm(`Are you sure you want to delete "${fileNode.name}"?`)
    if (!confirmed) return

    try {
      const effectiveDriveId = driveId || (window.location.hash.match(/#\/drive\/([^/]+)/)?.[1] ?? null)
      if (!effectiveDriveId || !api?.drives?.deleteFile) {
        console.error('Delete failed: no driveId or API')
        return
      }

      const path = fileNode.id.startsWith('/') ? fileNode.id : `/${fileNode.id}`
      const success = await api.drives.deleteFile(effectiveDriveId, path)
      
      if (success) {
        console.log(`[FolderContents] Successfully deleted ${fileNode.name}`)
        onFileDeleted?.()
      } else {
        console.error(`[FolderContents] Failed to delete ${fileNode.name}`)
        alert('Failed to delete file. Please try again.')
      }
    } catch (error) {
      console.error('[FolderContents] Delete error:', error)
      alert('An error occurred while deleting the file.')
    }
  }

  const handleDownloadFile = async (fileNode: TreeNode) => {
    if (fileNode.type !== 'file') return
    try {
      const effectiveDriveId = driveId || (window.location.hash.match(/#\/drive\/([^/]+)/)?.[1] ?? null)
      if (!effectiveDriveId || !api?.files?.getFileUrl) return
      const path = fileNode.id.startsWith('/') ? fileNode.id : `/${fileNode.id}`
      const url = await api.files.getFileUrl(effectiveDriveId, path)
      if (!url) throw new Error('No preview URL')
      const a = document.createElement('a')
      a.href = url
      a.download = fileNode.name
      document.body.appendChild(a)
      a.click()
      a.remove()
      // Best-effort revoke if blob:
      if (url.startsWith('blob:')) URL.revokeObjectURL(url)
    } catch (e) {
      console.error('[FolderContents] Download error:', e)
      alert('Failed to download file.')
    }
  }

  const handleCopyPath = async (fileNode: TreeNode) => {
    const path = fileNode.id.startsWith('/') ? fileNode.id : `/${fileNode.id}`
    try {
      await navigator.clipboard.writeText(path)
    } catch {}
  }

  const buildContextActions = (childNode: TreeNode): ContextMenuAction[] => {
    const actions: ContextMenuAction[] = []
    if (childNode.type === 'file') {
      actions.push(
        { id: 'open', label: 'Open', icon: <IconEye size={16} />, onClick: () => onFileClick?.(childNode) },
        { id: 'download', label: 'Download', icon: <IconDownload size={16} />, onClick: () => handleDownloadFile(childNode) },
        { id: 'copy', label: 'Copy path', icon: <IconCopy size={16} />, onClick: () => handleCopyPath(childNode) },
        { id: 'delete', label: 'Delete', icon: <IconTrash size={16} />, onClick: () => handleDeleteFile(childNode), destructive: true },
      )
    } else {
      actions.push(
        { id: 'open', label: 'Open', icon: <IconEye size={16} />, onClick: () => onFileClick?.(childNode) },
        { id: 'copy', label: 'Copy path', icon: <IconCopy size={16} />, onClick: () => handleCopyPath(childNode) },
      )
    }
    return actions
  }

  const onChildRightClick = (e: React.MouseEvent, childNode: TreeNode) => {
    e.preventDefault()
    e.stopPropagation()
    const menuActions = buildContextActions(childNode)
    openContextMenu(e, menuActions)
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="p-6 h-full"
    >
      <div className="bg-black/10 rounded-lg p-8 h-full">
        <div className="flex items-center justify-between mb-4 gap-2">
          <h3 className="text-lg font-semibold text-white">
            Folder Contents
          </h3>
          <div className="text-sm text-neutral-400 truncate">
            <span className="text-white font-medium">{node.name}</span>
            <span className="mx-2">•</span>
            <span>{totalItems} items</span>
            <span className="mx-2">•</span>
            <span>{folderCount} folders, {fileCount} files</span>
            {node.modified && (
              <>
                <span className="mx-2">•</span>
                <span>Modified {node.modified}</span>
              </>
            )}
          </div>
        </div>
        
        {(canNavigateUp || (node.children && node.children.length > 0)) ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {canNavigateUp && (
              <div
                key="pseudo-up"
                className="flex flex-col items-center p-4 cursor-pointer group"
                onClick={() => onNavigateUp?.()}
              >
                <GlareHover
                  width="80px"
                  height="80px"
                  background="rgba(0, 0, 0, 0.2)"
                  borderRadius="12px"
                  borderColor="transparent"
                  glareColor="#ffffff"
                  glareOpacity={0.3}
                  glareAngle={-30}
                  glareSize={300}
                  transitionDuration={800}
                  playOnce={false}
                  className="mb-3"
                >
                  <div className="w-full h-full flex items-center justify-center">
                    <img src={FolderIcon} alt="Folder" className="w-8 h-8" />
                  </div>
                </GlareHover>
                <span className="text-sm text-white text-center truncate w-full px-1">..</span>
                <span className="text-xs text-neutral-400 text-center mt-1">Parent</span>
              </div>
            )}
            {node.children?.map((child) => (
              <div
                key={child.id}
                className="flex flex-col items-center p-4 cursor-pointer group"
                onClick={() => onFileClick?.(child)}
                onContextMenu={(e) => onChildRightClick(e, child)}
              >
                <GlareHover
                  width="80px"
                  height="80px"
                  background="rgba(0, 0, 0, 0.2)"
                  borderRadius="12px"
                  borderColor="transparent"
                  glareColor="#ffffff"
                  glareOpacity={0.3}
                  glareAngle={-30}
                  glareSize={300}
                  transitionDuration={800}
                  playOnce={false}
                  className="mb-3"
                >
                  <div className="w-full h-full flex items-center justify-center">
                    {child.type === 'folder' ? (
                      <img src={FolderIcon} alt="Folder" className="w-8 h-8" />
                    ) : (
                      <FileIcon node={child} />
                    )}
                  </div>
                </GlareHover>
                <span className="text-sm text-white text-center truncate w-full px-1">
                  {child.name}
                </span>
                {child.size && (
                  <span className="text-xs text-neutral-400 text-center mt-1">
                    {child.size}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-black/20 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <img src={FolderIcon} alt="Folder" className="w-8 h-8" />
            </div>
            <p className="text-neutral-400">This folder is empty</p>
          </div>
        )}
      </div>
      <ContextMenu isOpen={isOpen} position={position} actions={actions} onClose={closeContextMenu} />
    </motion.div>
  );
};

export function ContentPanel({ selectedNode, onFileClick, onNavigateUp, canNavigateUp, driveId, onFileDeleted, onCreateFolder, onRefresh, className }: ContentPanelProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const api: any = (window as any)?.api
  const { isOpen, position, actions, openContextMenu, closeContextMenu } = useContextMenu()

  const handleDeleteFile = async () => {
    if (!selectedNode || selectedNode.type !== 'file') return
    
    const confirmed = window.confirm(`Are you sure you want to delete "${selectedNode.name}"?`)
    if (!confirmed) return

    try {
      const effectiveDriveId = driveId || (window.location.hash.match(/#\/drive\/([^/]+)/)?.[1] ?? null)
      const hasApi = !!api?.drives?.deleteFile
      console.log('[ContentPanel] Delete debug:', { effectiveDriveId, hasApi, selectedNode })
      if (!effectiveDriveId || !hasApi) {
        console.error('Delete failed: no driveId or API')
        return
      }

      const path = selectedNode.id.startsWith('/') ? selectedNode.id : `/${selectedNode.id}`
      const success = await api.drives.deleteFile(effectiveDriveId, path)
      
      if (success) {
        console.log(`[ContentPanel] Successfully deleted ${selectedNode.name}`)
        onFileDeleted?.()
      } else {
        console.error(`[ContentPanel] Failed to delete ${selectedNode.name}`)
        alert('Failed to delete file. Please try again.')
      }
    } catch (error) {
      console.error('[ContentPanel] Delete error:', error)
      alert('An error occurred while deleting the file.')
    }
  }

  const handleDownloadFile = async () => {
    if (!selectedNode || selectedNode.type !== 'file') return
    try {
      const effectiveDriveId = driveId || (window.location.hash.match(/#\/drive\/([^/]+)/)?.[1] ?? null)
      if (!effectiveDriveId || !api?.files?.getFileUrl) return
      const path = selectedNode.id.startsWith('/') ? selectedNode.id : `/${selectedNode.id}`
      const url = await api.files.getFileUrl(effectiveDriveId, path)
      if (!url) throw new Error('No preview URL')
      const a = document.createElement('a')
      a.href = url
      a.download = selectedNode.name
      document.body.appendChild(a)
      a.click()
      a.remove()
      // Best-effort revoke if blob:
      if (url.startsWith('blob:')) URL.revokeObjectURL(url)
    } catch (e) {
      console.error('[ContentPanel] Download error:', e)
      alert('Failed to download file.')
    }
  }

  const handleCopyPath = async () => {
    if (!selectedNode) return
    const path = selectedNode.id.startsWith('/') ? selectedNode.id : `/${selectedNode.id}`
    try {
      await navigator.clipboard.writeText(path)
    } catch {}
  }

  const buildContextActions = React.useCallback((): ContextMenuAction[] => {
    if (!selectedNode) return []
    console.log('[ContentPanel] buildContextActions - selectedNode:', selectedNode)
    const actions: ContextMenuAction[] = []
    if (selectedNode.type === 'file') {
      console.log('[ContentPanel] Adding file actions for:', selectedNode.name)
      actions.push(
        { id: 'open', label: 'Open', icon: <IconEye size={16} />, onClick: () => {} },
        { id: 'download', label: 'Download', icon: <IconDownload size={16} />, onClick: handleDownloadFile },
        { id: 'copy', label: 'Copy path', icon: <IconCopy size={16} />, onClick: handleCopyPath },
        { id: 'delete', label: 'Delete', icon: <IconTrash size={16} />, onClick: handleDeleteFile, destructive: true },
      )
    } else {
      console.log('[ContentPanel] Adding folder actions for:', selectedNode.name)
      actions.push(
        { id: 'create-folder', label: 'Create Folder', icon: <IconFolderPlus size={16} />, onClick: () => {
          console.log('[ContentPanel] Create folder clicked, selectedNode.id:', selectedNode.id)
          // If we're at virtual-root (fresh app state), use actual root '/'
          const currentFolderPath = selectedNode.id === 'virtual-root' ? '/' : selectedNode.id
          onCreateFolder?.(currentFolderPath)
        }},
        { id: 'refresh', label: 'Refresh', icon: <IconArrowUp size={16} />, onClick: () => onRefresh?.() },
        { id: 'copy', label: 'Copy path', icon: <IconCopy size={16} />, onClick: handleCopyPath },
      )
    }
    console.log('[ContentPanel] Built actions:', actions)
    return actions
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNode])

  const onRightClick = (e: React.MouseEvent) => {
    const menuActions = buildContextActions()
    openContextMenu(e, menuActions)
  }

  const onEmptyAreaRightClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const emptyAreaActions: ContextMenuAction[] = [
      { id: 'create-folder', label: 'Create Folder', icon: <IconFolderPlus size={16} />, onClick: () => {
        // Use the current folder's path instead of hardcoded root
        // If we're at virtual-root (fresh app state), use actual root '/'
        const currentFolderPath = selectedNode?.id === 'virtual-root' ? '/' : (selectedNode?.id || '/')
        onCreateFolder?.(currentFolderPath)
      }},
      { id: 'refresh', label: 'Refresh', icon: <IconArrowUp size={16} />, onClick: () => {
        onRefresh?.()
      }},
    ]
    
    openContextMenu(e, emptyAreaActions)
  }

  if (!selectedNode) {
    return (
      <div className={cn("flex items-center justify-center h-full", className)} onContextMenu={onEmptyAreaRightClick}>
      <div className="text-center">
        <div className="w-16 h-16 bg-black/20 rounded-lg mx-auto mb-4 flex items-center justify-center">
          <img src={FolderIcon} alt="Folder" className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">
          Select a file or folder
        </h3>
        <p className="text-neutral-400">
          Choose an item from the sidebar to view its contents or preview
        </p>
      </div>
      <ContextMenu isOpen={isOpen} position={position} actions={actions} onClose={closeContextMenu} />
      </div>
    );
  }

  return (
    <div className={cn("h-full overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-neutral-800 bg-black/5", className)}>
      {/* Actions Header - only for files */}
      {selectedNode.type === 'file' && (
        <div className="sticky top-0 z-10 bg-black/5 backdrop-blur-sm border-b border-neutral-700/30 p-4">
          <div className="flex justify-end">
            <div className="flex gap-2">
              <MagicButton className="text-sm flex items-center gap-2">
                <IconDownload size={16} />
                Download
              </MagicButton>
              <MagicButton className="text-sm flex items-center gap-2">
                <IconShare size={16} />
                Share
              </MagicButton>
              <MagicButton 
                className="text-sm flex items-center gap-2"
                onClick={handleDeleteFile}
              >
                <IconTrash size={16} />
                Delete
              </MagicButton>
            </div>
          </div>
        </div>
      )}
      
      {selectedNode.type === 'folder' ? (
        <div className="h-full" onContextMenu={onRightClick}>
          <FolderContents node={selectedNode} onFileClick={onFileClick} onNavigateUp={onNavigateUp} canNavigateUp={canNavigateUp} driveId={driveId} onFileDeleted={onFileDeleted} />
        </div>
      ) : (
        <div onContextMenu={onRightClick}>
          <FilePreview node={selectedNode} />
          <FileMetadata node={selectedNode} />
        </div>
      )}

      <ContextMenu isOpen={isOpen} position={position} actions={actions} onClose={closeContextMenu} />
    </div>
  );
}
