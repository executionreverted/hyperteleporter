"use client";
import { cn } from "../../renderer/lib/utils";
import * as React from "react";
import { useMemo, useState, useCallback } from "react";
import { TreeNode } from "./tree-view";
import { motion } from "motion/react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { MagicButton } from "../../renderer/src/components/common/MagicButton";
import { IconDownload, IconShare, IconTrash, IconEye, IconCopy, IconFolderPlus, IconArrowUp, IconFileTypePdf, IconLoader2, IconInfoCircle } from "@tabler/icons-react";
import FolderIcon from "../../renderer/src/assets/folder.svg";
import { ContextMenu, useContextMenu, type ContextMenuAction } from "./context-menu";
import GlareHover from "./glare-hover";
import { AnimatePresence } from "motion/react";
import { useToaster } from "../../renderer/src/contexts/ToasterContext";
import { useConfirm } from "./confirm-modal";
import { useContentSorting } from "../../renderer/src/hooks/useContentSorting";
import { ContentSortControls } from "../../renderer/src/components/common/ContentSortControls";
import { useFolderSize } from "../../renderer/src/hooks/useFolderSize";
import { useFolderCreationTime } from "../../renderer/src/hooks/useFolderCreationTime";
import { useDownloadProgress } from "../../renderer/src/contexts/DownloadProgressContext";

// Component for individual folder/file items with size display
const FolderItem = ({ 
  child, 
  driveId, 
  onFileClick, 
  onPreviewAnchor, 
  onChildRightClick,
  onFolderSizeUpdate,
  onFolderCreationTimeUpdate
}: { 
  child: TreeNode
  driveId?: string
  onFileClick?: (node: TreeNode) => void
  onPreviewAnchor?: (rect: DOMRect, node: TreeNode) => void
  onChildRightClick: (e: React.MouseEvent, childNode: TreeNode) => void
  onFolderSizeUpdate?: (folderId: string, size: string) => void
  onFolderCreationTimeUpdate?: (folderId: string, createdAt: string) => void
}) => {
  const { size: folderSize, loading: sizeLoading } = useFolderSize(
    driveId, 
    child.type === 'folder' ? child.id : undefined
  )

  const { createdAt: folderCreatedAt, loading: creationTimeLoading } = useFolderCreationTime(
    driveId,
    child.type === 'folder' ? child.id : undefined
  )

  // Update parent with folder size when it's calculated
  React.useEffect(() => {
    if (child.type === 'folder' && folderSize && onFolderSizeUpdate) {
      onFolderSizeUpdate(child.id, folderSize)
    }
  }, [child.id, child.type, folderSize, onFolderSizeUpdate])

  // Update parent with folder creation time when it's calculated
  React.useEffect(() => {
    if (child.type === 'folder' && folderCreatedAt && onFolderCreationTimeUpdate) {
      onFolderCreationTimeUpdate(child.id, folderCreatedAt)
    }
  }, [child.id, child.type, folderCreatedAt, onFolderCreationTimeUpdate])


  return (
    <div
      key={child.id}
      className="flex flex-col items-center p-4 cursor-pointer group"
      onClick={(e) => {
        if (child.type === 'file') {
          try {
            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
            onPreviewAnchor?.(rect, child)
          } catch {}
          // Do not change selection/view; just open modal
          return
        }
        onFileClick?.(child)
      }}
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
          ) : (() => {
            // Check if it's an image file by extension
            const extension = child.name.split('.').pop()?.toLowerCase();
            const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(extension || '');
            
            return isImage ? (
              <ImagePreviewIcon node={child} driveId={driveId} size="folder" />
            ) : (
              <FileIcon node={child} />
            );
          })()}
        </div>
      </GlareHover>
      <span className="text-sm text-white text-center truncate w-full px-1">
        {child.name}
      </span>
      {/* Size display for both files and folders */}
      {(child.size || folderSize || sizeLoading) && (
        <span className="text-xs text-neutral-400 text-center mt-1">
          {sizeLoading ? (
            <span className="inline-flex items-center gap-1">
              <div className="w-2 h-2 border border-neutral-400 border-t-transparent rounded-full animate-spin"></div>
              <span>Loading...</span>
            </span>
          ) : (
            child.size || folderSize
          )}
        </span>
      )}
    </div>
  )
}

interface ContentPanelProps {
  selectedNode?: TreeNode;
  onFileClick?: (node: TreeNode) => void;
  onNavigateUp?: () => void;
  canNavigateUp?: boolean;
  driveId?: string;
  onFileDeleted?: () => void;
  onCreateFolder?: (parentPath: string) => void;
  onRefresh?: () => void;
  onDownloadFile?: (node: TreeNode) => void;
  onDownloadFolder?: (node: TreeNode) => void;
  onShowDownloads?: () => void;
  onPreviewAnchor?: (rect: DOMRect, node: TreeNode) => void;
  // External preview state (when onPreviewAnchor is provided)
  previewRect?: DOMRect | null;
  isPreviewOpen?: boolean;
  previewNode?: TreeNode | null;
  onClosePreview?: () => void;
  className?: string;
  canWrite?: boolean;
  currentDrive?: { name: string; id: string };
  syncStatus?: { version: number; peers: number; isFindingPeers: boolean };
  isDriveSyncing?: boolean;
}

import { FileIcon, ImagePreviewIcon } from "./file-icons";

const FilePreview = ({ node, insideModal = false, onShowDownloads, onClosePreview, currentDrive }: { node: TreeNode; insideModal?: boolean; onShowDownloads?: () => void; onClosePreview?: () => void; currentDrive?: { name: string; id: string } }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const api: any = (window as any)?.api
  const [imgUrl, setImgUrl] = React.useState<string | null>(null)
  const [loadingImg, setLoadingImg] = React.useState(false)
  const [imgError, setImgError] = React.useState<string | null>(null)
  const [isFileTooLarge, setIsFileTooLarge] = React.useState(false)
  const { startDownload, updateDownloadPath, completeDownload, failDownload } = useDownloadProgress()
  const toaster = useToaster()
  
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
      <div className={insideModal ? "p-4 h-full" : "p-6"}>
        <div className={
          insideModal
            ? "bg-black/10 rounded-lg p-4 max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-neutral-800 hover:scrollbar-thumb-neutral-500"
            : "bg-black/10 rounded-lg p-4 max-h-[480px] overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-neutral-800 hover:scrollbar-thumb-neutral-500"
        }>
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
    // Check if file is too large for preview
    if (isFileTooLarge) {
      return (
        <div className={insideModal ? "p-4" : "p-6"}>
          <div className="text-center">
            <div className="text-neutral-300 mb-4">
              <div className="text-lg font-medium mb-2">File too large to preview</div>
              <div className="text-sm">This file is larger than 50MB. Download to view the file.</div>
            </div>
            <MagicButton
              onClick={async () => {
                try {
                  const match = window.location.hash.match(/#\/drive\/([^/]+)/)
                  const driveId = match ? match[1] : null
                  if (!driveId || !api?.drives?.downloadFile) return
                  
                  const path = node.id.startsWith('/') ? node.id : `/${node.id}`
                  const fileName = node.name
                  const driveName = currentDrive?.name || 'Unknown Drive'
                  
                  // Start download progress tracking
                  const downloadId = `download-${Date.now()}`
                  startDownload(fileName, 1, downloadId, '') // Single file download
                  
                  // Open downloads modal to show progress
                  onShowDownloads?.()
                  
                  toaster.showInfo('Download Started', `Downloading ${fileName}...`)
                  
                  // Download file to Downloads folder
                  const result = await api.drives.downloadFile(driveId, path, fileName, driveName)
                  
                  if (result?.success) {
                    // Update download path and complete
                    updateDownloadPath(downloadId, result.downloadPath)
                    completeDownload(downloadId)
                    
                    toaster.showSuccess('Download Complete', `${fileName} saved to Downloads/HyperTeleporter/${driveName}/`, {
                      label: 'Open Folder',
                      onClick: () => api?.downloads?.openFolder?.(result.downloadPath)
                    })
                    
                    // Close preview modal
                    onClosePreview?.()
                    
                    // Dispatch event to refresh downloads modal
                    window.dispatchEvent(new CustomEvent('download-completed'))
                  } else {
                    failDownload(downloadId, result?.error || 'Unknown error')
                    toaster.showError('Download Failed', `Failed to download ${fileName}: ${result?.error || 'Unknown error'}`)
                  }
                } catch (error) {
                  const downloadId = `download-${Date.now()}`
                  failDownload(downloadId, 'Download failed. Please try again.')
                  toaster.showError('Download Failed', 'Failed to download file. Please try again.')
                  console.error('Failed to download file:', error)
                }
              }}
            >
              Download File
            </MagicButton>
          </div>
        </div>
      )
    }

    switch (fileType) {
      case 'txt':
      case 'md':
        return (
          <MarkdownPreview node={node} insideModal={insideModal} />
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
          <div className={insideModal ? "p-4" : "p-6"}>
            <div className={`bg-gray-100 dark:bg-black/10 rounded-lg p-4 ${insideModal ? 'max-h-[60vh]' : 'max-h-[480px]'} overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-neutral-800 hover:scrollbar-thumb-neutral-500`}>
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
          <MediaPreview node={node} type="video" onShowDownloads={onShowDownloads} onClosePreview={onClosePreview} currentDrive={currentDrive} />
        );

      case 'pdf':
        return (
          <div className={insideModal ? "p-4" : "p-6"}>
            <div className={`bg-gray-100 dark:bg-black/10 rounded-lg p-4 ${insideModal ? 'max-h-[60vh]' : 'max-h-[480px]'} overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-neutral-800 hover:scrollbar-thumb-neutral-500`}>
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
          <MediaPreview node={node} type="audio" onShowDownloads={onShowDownloads} onClosePreview={onClosePreview} currentDrive={currentDrive} />
        );

      default:
        return <TextPreview node={node} insideModal={insideModal} />;
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
      
      // First, try to download the file if it's not available locally
      const loadImage = async () => {
        if (api?.files?.downloadFile) {
          console.log(`[FilePreview] Attempting to download image: ${path}`)
          const downloadSuccess = await api.files.downloadFile(driveId, path)
          if (downloadSuccess) {
            console.log(`[FilePreview] Image downloaded successfully: ${path}`)
          } else {
            console.warn(`[FilePreview] Image download failed: ${path}`)
          }
        }
        
        const url = await api.files.getFileUrl(driveId, path)
        if (url === 'FILE_TOO_LARGE') {
          setIsFileTooLarge(true)
          return
        }
        if (!url) throw new Error('No data')
        setImgUrl(url)
      }
      
      loadImage()
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

function MarkdownPreview({ node, insideModal = false }: { node: TreeNode; insideModal?: boolean }) {
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

  if (loading) return <div className={insideModal ? "p-4" : "p-6"}><div className="text-neutral-300">Loading…</div></div>
  if (error) return <div className={insideModal ? "p-4" : "p-6"}><div className="text-red-400">{error}</div></div>
  if (!content) return null

  return (
    <div className={insideModal ? "p-4" : "p-6"}>
      <div className={`bg-black/10 rounded-lg p-4 ${insideModal ? 'max-h-[60vh]' : 'max-h-[480px]'} overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-neutral-800 hover:scrollbar-thumb-neutral-500`}>
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

function TextPreview({ node, insideModal = false }: { node: TreeNode; insideModal?: boolean }) {
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

  if (loading) return <div className={insideModal ? "p-4" : "p-6"}><div className="text-neutral-300">Loading…</div></div>
  if (error) return <div className={insideModal ? "p-4" : "p-6"}><div className="text-red-400">{error}</div></div>
  if (!content) return null

  return (
    <div className={insideModal ? "p-4" : "p-6"}>
      <div className={`bg-black/10 rounded-lg p-4 ${insideModal ? 'max-h-[60vh]' : 'max-h-[480px]'} overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-neutral-800 hover:scrollbar-thumb-neutral-500`}>
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

function MediaPreview({ node, type, onShowDownloads, onClosePreview, currentDrive }: { node: TreeNode; type: 'audio' | 'video'; onShowDownloads?: () => void; onClosePreview?: () => void; currentDrive?: { name: string; id: string } }) {
  const [url, setUrl] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [isFileTooLarge, setIsFileTooLarge] = React.useState(false)
  const { startDownload, updateDownloadPath, completeDownload, failDownload } = useDownloadProgress()
  const toaster = useToaster()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const api: any = (window as any)?.api

  React.useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        setError(null)
        setIsFileTooLarge(false)
        const match = window.location.hash.match(/#\/drive\/([^/]+)/)
        const driveId = match ? match[1] : null
        if (!driveId || !api?.files?.getFileUrl) {
          setError('Preview not available')
          return
        }
        const path = node.id.startsWith('/') ? node.id : `/${node.id}`
        
        // First, try to download the file if it's not available locally
        if (api?.files?.downloadFile) {
          console.log(`[MediaPreview] Attempting to download file: ${path}`)
          const downloadSuccess = await api.files.downloadFile(driveId, path)
          if (downloadSuccess) {
            console.log(`[MediaPreview] File downloaded successfully: ${path}`)
          } else {
            console.warn(`[MediaPreview] File download failed: ${path}`)
          }
        }
        
        const blobUrl = await api.files.getFileUrl(driveId, path)
        if (blobUrl === 'FILE_TOO_LARGE') {
          setIsFileTooLarge(true)
          return
        }
        if (!blobUrl) throw new Error('Empty')
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
  if (isFileTooLarge) {
    return (
      <div className="p-6 text-center">
        <div className="text-neutral-300 mb-4">
          <div className="text-lg font-medium mb-2">File too large to preview</div>
          <div className="text-sm">This file is larger than 50MB. Download to view the file.</div>
        </div>
        <MagicButton
          onClick={async () => {
            try {
              const match = window.location.hash.match(/#\/drive\/([^/]+)/)
              const driveId = match ? match[1] : null
              if (!driveId || !api?.drives?.downloadFile) return
              
              const path = node.id.startsWith('/') ? node.id : `/${node.id}`
              const fileName = node.name
              const driveName = currentDrive?.name || 'Unknown Drive'
              
              // Start download progress tracking
              const downloadId = `download-${Date.now()}`
              startDownload(fileName, 1, downloadId, '') // Single file download
              
              // Open downloads modal to show progress
              onShowDownloads?.()
              
              toaster.showInfo('Download Started', `Downloading ${fileName}...`)
              
              // Download file to Downloads folder
              const result = await api.drives.downloadFile(driveId, path, fileName, driveName)
              
              if (result?.success) {
                // Update download path and complete
                updateDownloadPath(downloadId, result.downloadPath)
                completeDownload(downloadId)
                
                toaster.showSuccess('Download Complete', `${fileName} saved to Downloads/HyperTeleporter/${driveName}/`, {
                  label: 'Open Folder',
                  onClick: () => api?.downloads?.openFolder?.(result.downloadPath)
                })
                
                // Close preview modal
                onClosePreview?.()
                
                // Dispatch event to refresh downloads modal
                window.dispatchEvent(new CustomEvent('download-completed'))
              } else {
                failDownload(downloadId, result?.error || 'Unknown error')
                toaster.showError('Download Failed', `Failed to download ${fileName}: ${result?.error || 'Unknown error'}`)
              }
            } catch (error) {
              const downloadId = `download-${Date.now()}`
              failDownload(downloadId, 'Download failed. Please try again.')
              toaster.showError('Download Failed', 'Failed to download file. Please try again.')
              console.error('Failed to download file:', error)
            }
          }}
        >
          Download File
        </MagicButton>
      </div>
    )
  }
  if (!url) return null

  return (
    <div className="p-6">
      <div className="bg-black/10 rounded-lg p-4">
        {type === 'video' ? (
          <video 
            src={url} 
            controls 
            className="max-h-[420px] w-full rounded-md"
            onError={(e) => {/* Video error */}}
            onLoadStart={() => {/* Video load started */}}
          />
        ) : (
          <audio 
            src={url} 
            controls 
            className="w-full"
            onError={(e) => {/* Audio error */}}
            onLoadStart={() => {/* Audio load started */}}
            onCanPlay={() => {/* Audio can play */}}
            onCanPlayThrough={() => {/* Audio can play through */}}
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
              {node.createdAt ? new Date(node.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const FolderContents = ({ node, onFileClick, onNavigateUp, canNavigateUp, driveId, onFileDeleted, onPreviewAnchor, onDownloadFile, onDownloadFolder, canWrite = true, currentDrive }: { node: TreeNode; onFileClick?: (node: TreeNode) => void; onNavigateUp?: () => void; canNavigateUp?: boolean; driveId?: string; onFileDeleted?: () => void; onPreviewAnchor?: (rect: DOMRect, node: TreeNode) => void; onDownloadFile?: (node: TreeNode) => void; onDownloadFolder?: (node: TreeNode) => void; canWrite?: boolean; currentDrive?: { name: string; id: string } }) => {
  const totalItems = node.children ? node.children.length : 0;
  const folderCount = node.children ? node.children.filter(c => c.type === 'folder').length : 0;
  const fileCount = totalItems - folderCount;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const api: any = (window as any)?.api
  const toaster = useToaster()
  const { isOpen, position, actions, openContextMenu, closeContextMenu } = useContextMenu()
  const { confirm, ConfirmDialog } = useConfirm()
  
  // Sorting functionality
  const { sortConfig, sortFiles, setSortCriteria, setSortDirection } = useContentSorting()
  
  // Track folder sizes and creation times for re-sorting
  const [folderSizes, setFolderSizes] = useState<{ [key: string]: string }>({})
  const [folderCreationTimes, setFolderCreationTimes] = useState<{ [key: string]: string }>({})
  
  // Handle folder size updates
  const handleFolderSizeUpdate = useCallback((folderId: string, size: string) => {
    setFolderSizes(prev => ({
      ...prev,
      [folderId]: size
    }))
  }, [])

  // Handle folder creation time updates
  const handleFolderCreationTimeUpdate = useCallback((folderId: string, createdAt: string) => {
    setFolderCreationTimes(prev => ({
      ...prev,
      [folderId]: createdAt
    }))
  }, [])
  
  // Sort the children
  const sortedChildren = useMemo(() => {
    if (!node.children) return []
    
    // Create a copy of children with updated sizes and creation times
    const childrenWithMetadata = node.children.map(child => ({
      ...child,
      size: child.size || folderSizes[child.id] || undefined,
      createdAt: child.createdAt || folderCreationTimes[child.id] || undefined
    }))
    
    return sortFiles(childrenWithMetadata)
  }, [node.children, sortFiles, folderSizes, folderCreationTimes])

  const handleDeleteFile = async (fileNode: TreeNode) => {
    confirm({
      title: 'Delete Item',
      message: `Are you sure you want to delete "${fileNode.name}"?${fileNode.type === 'folder' ? ' This will delete all contents inside the folder.' : ''}`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmButtonClass: 'bg-red-500 hover:bg-red-600 text-white',
      onConfirm: async () => {
        try {
          const effectiveDriveId = driveId || (window.location.hash.match(/#\/drive\/([^/]+)/)?.[1] ?? null)
          if (!effectiveDriveId || !api?.drives?.deleteFile) {
            console.error('Delete failed: no driveId or API')
            toaster.showError('Delete Failed', 'No drive ID or API available')
            return
          }

          const path = fileNode.id.startsWith('/') ? fileNode.id : `/${fileNode.id}`
          const success = await api.drives.deleteFile(effectiveDriveId, path)
          
          if (success) {
            toaster.showSuccess('Item Deleted', `${fileNode.name} has been deleted successfully`)
            onFileDeleted?.()
          } else {
            console.error(`[FolderContents] Failed to delete ${fileNode.name}`)
            toaster.showError('Delete Failed', 'Failed to delete item. Please try again.')
          }
        } catch (error) {
          console.error('[FolderContents] Delete error:', error)
          toaster.showError('Delete Error', 'An error occurred while deleting the item.')
        }
      }
    })
  }

  const handleDownloadFile = async (fileNode: TreeNode) => {
    if (fileNode.type !== 'file' || !driveId || !currentDrive) return
    
    try {
      toaster.showInfo('Download Started', `Downloading ${fileNode.name}...`)
      
      const result = await api?.drives?.downloadFile?.(driveId, fileNode.id, fileNode.name, currentDrive.name)
      
      if (result?.success) {
        toaster.showSuccess('Download Complete', `${fileNode.name} saved to Downloads/HyperTeleporter/${currentDrive.name}/`, {
          label: 'Open Folder',
          onClick: () => api?.downloads?.openFolder?.(result.downloadPath)
        })
        // Dispatch event to refresh downloads modal
        window.dispatchEvent(new CustomEvent('download-completed'))
      } else {
        console.error('[FolderContents] Download failed:', result?.error)
        toaster.showError('Download Failed', `Failed to download file: ${result?.error || 'Unknown error'}`)
      }
    } catch (e) {
      console.error('[FolderContents] Download error:', e)
      toaster.showError('Download Failed', 'Failed to download file. Please try again.')
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
        { id: 'download', label: 'Download', icon: <IconDownload size={16} />, onClick: () => onDownloadFile?.(childNode) },
        { id: 'copy', label: 'Copy path', icon: <IconCopy size={16} />, onClick: () => handleCopyPath(childNode) },
      )
      if (canWrite) actions.push({ id: 'delete', label: 'Delete', icon: <IconTrash size={16} />, onClick: () => handleDeleteFile(childNode), destructive: true })
    } else {
      actions.push(
        { id: 'open', label: 'Open', icon: <IconEye size={16} />, onClick: () => onFileClick?.(childNode) },
        { id: 'download-all', label: 'Download All', icon: <IconDownload size={16} />, onClick: () => onDownloadFolder?.(childNode) },
        { id: 'copy', label: 'Copy path', icon: <IconCopy size={16} />, onClick: () => handleCopyPath(childNode) },
      )
      if (canWrite) actions.push({ id: 'delete', label: 'Delete', icon: <IconTrash size={16} />, onClick: () => handleDeleteFile(childNode), destructive: true })
    }
    
    // Add Info action for both files and folders
    actions.push({
      id: 'info',
      label: 'Info',
      icon: <IconInfoCircle size={16} />,
      onClick: () => {
        // Show folder/file info preview
        // Create a fake rect for the preview modal (centered on screen)
        const fakeRect = {
          left: window.innerWidth / 2 - 100,
          top: window.innerHeight / 2 - 100,
          width: 200,
          height: 200,
          right: window.innerWidth / 2 + 100,
          bottom: window.innerHeight / 2 + 100,
          x: window.innerWidth / 2 - 100,
          y: window.innerHeight / 2 - 100,
          toJSON: () => fakeRect,
        } as DOMRect
        
        onPreviewAnchor?.(fakeRect, childNode)
      },
    })
    
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
      className="p-6"
    >
      <div className="bg-black/10 rounded-lg">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-black/10 backdrop-blur-sm border-b border-white/10 p-8 pb-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {canNavigateUp ? (
                <span
                  role="button"
                  aria-label="Back"
                  title="Back"
                  onClick={() => onNavigateUp?.()}
                  className="text-neutral-400 hover:text-white cursor-pointer select-none"
                >
                  {/* minimal chevron */}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </span>
              ) : (
                <span className="text-neutral-700 select-none" aria-hidden="true">
                  {/* placeholder to preserve width/height */}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </span>
              )}
              <h3 className="text-lg font-semibold text-white">
                Folder Contents
              </h3>
            </div>
            <div className="flex items-center gap-4">
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
              {totalItems > 0 && (
                <ContentSortControls
                  currentCriteria={sortConfig.criteria}
                  currentDirection={sortConfig.direction}
                  onCriteriaChange={setSortCriteria}
                  onDirectionChange={setSortDirection}
                />
              )}
            </div>
          </div>
        </div>
        
        {/* Content Area */}
        <div className="p-8 pt-4">
        
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
            {sortedChildren.map((child) => (
              <FolderItem
                key={child.id}
                child={child}
                driveId={driveId}
                onFileClick={onFileClick}
                onPreviewAnchor={onPreviewAnchor}
                onChildRightClick={onChildRightClick}
                onFolderSizeUpdate={handleFolderSizeUpdate}
                onFolderCreationTimeUpdate={handleFolderCreationTimeUpdate}
              />
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
      </div>
      <ContextMenu isOpen={isOpen} position={position} actions={actions} onClose={closeContextMenu} />
      <ConfirmDialog />
    </motion.div>
  );
};

export function ContentPanel({ selectedNode, onFileClick, onNavigateUp, canNavigateUp, driveId, onFileDeleted, onCreateFolder, onRefresh, onDownloadFile, onDownloadFolder, onShowDownloads, onPreviewAnchor, previewRect, isPreviewOpen, previewNode, onClosePreview, className, canWrite = true, currentDrive, syncStatus, isDriveSyncing }: ContentPanelProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const api: any = (window as any)?.api
  const toaster = useToaster()
  const { isOpen, position, actions, openContextMenu, closeContextMenu } = useContextMenu()
  const { confirm, ConfirmDialog } = useConfirm()

  // Preview modal state MUST be declared before any early returns to preserve hook order
  // Use external state if provided, otherwise use internal state
  const [internalPreviewRect, setInternalPreviewRect] = React.useState<DOMRect | null>(null)
  const [internalIsPreviewOpen, setInternalIsPreviewOpen] = React.useState(false)
  const [internalPreviewNode, setInternalPreviewNode] = React.useState<TreeNode | null>(null)
  
  // Use external state if provided, otherwise use internal state
  const currentPreviewRect = previewRect !== undefined ? previewRect : internalPreviewRect
  const currentIsPreviewOpen = isPreviewOpen !== undefined ? isPreviewOpen : internalIsPreviewOpen
  const currentPreviewNode = previewNode !== undefined ? previewNode : internalPreviewNode
  const currentClosePreview = onClosePreview || (() => setInternalIsPreviewOpen(false))
  
  // Loading state for preview content
  const [isPreviewLoading, setIsPreviewLoading] = React.useState(false)

  // Handle preview loading state
  React.useEffect(() => {
    if (currentIsPreviewOpen && currentPreviewNode) {
      setIsPreviewLoading(true)
      const timer = setTimeout(() => {
        setIsPreviewLoading(false)
      }, 250) // 250ms delay before showing content
      
      return () => clearTimeout(timer)
    } else {
      setIsPreviewLoading(false)
    }
  }, [currentIsPreviewOpen, currentPreviewNode])

  const openPreviewFromRect = (rect: DOMRect, node?: TreeNode) => {
    if (onPreviewAnchor) {
      // When external handler is provided, just call it and let it handle the modal
      onPreviewAnchor(rect, node!)
    } else {
      // When no external handler, manage internal state
      setInternalPreviewRect(rect)
      if (node) setInternalPreviewNode(node)
      setInternalIsPreviewOpen(true)
    }
  }

  const closePreview = () => {
    // Trigger exit animation by closing; keep node until onExited
    currentClosePreview()
  }


  // Listen for global preview requests (from tree view single-clicks)
  // Only listen when no external onPreviewAnchor is provided to avoid circular dependency
  React.useEffect(() => {
    if (onPreviewAnchor) return // Don't listen when external handler is provided
    
    const handler = (e: any) => {
      try {
        const { rect, node } = e.detail || {}
        if (!node) return
        const domRect = rect ? ({
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          right: rect.left + rect.width,
          bottom: rect.top + rect.height,
          x: rect.left,
          y: rect.top,
          toJSON: () => rect,
        } as unknown as DOMRect) : null
        openPreviewFromRect(domRect as DOMRect, node)
      } catch {}
    }
    window.addEventListener('open-preview', handler as EventListener)
    return () => window.removeEventListener('open-preview', handler as EventListener)
  }, [onPreviewAnchor])

  const handleDeleteFile = async () => {
    if (!selectedNode) return
    
    confirm({
      title: 'Delete Item',
      message: `Are you sure you want to delete "${selectedNode.name}"?${selectedNode.type === 'folder' ? ' This will delete all contents inside the folder.' : ''}`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmButtonClass: 'bg-red-500 hover:bg-red-600 text-white',
      onConfirm: async () => {
        try {
          const effectiveDriveId = driveId || (window.location.hash.match(/#\/drive\/([^/]+)/)?.[1] ?? null)
          const hasApi = !!api?.drives?.deleteFile
          if (!effectiveDriveId || !hasApi) {
            console.error('Delete failed: no driveId or API')
            toaster.showError('Delete Failed', 'No drive ID or API available')
            return
          }

          const path = selectedNode.id.startsWith('/') ? selectedNode.id : `/${selectedNode.id}`
          const success = await api.drives.deleteFile(effectiveDriveId, path)
          
          if (success) {
            toaster.showSuccess('Item Deleted', `${selectedNode.name} has been deleted successfully`)
            onFileDeleted?.()
          } else {
            console.error(`[ContentPanel] Failed to delete ${selectedNode.name}`)
            toaster.showError('Delete Failed', 'Failed to delete item. Please try again.')
          }
        } catch (error) {
          console.error('[ContentPanel] Delete error:', error)
          toaster.showError('Delete Error', 'An error occurred while deleting the item.')
        }
      }
    })
  }

  const handleDownloadFile = async () => {
    if (!selectedNode || selectedNode.type !== 'file' || !driveId || !currentDrive) return
    
    try {
      toaster.showInfo('Download Started', `Downloading ${selectedNode.name}...`)
      
      const result = await api?.drives?.downloadFile?.(driveId, selectedNode.id, selectedNode.name, currentDrive.name)
      
      if (result?.success) {
        toaster.showSuccess('Download Complete', `${selectedNode.name} saved to Downloads/HyperTeleporter/${currentDrive.name}/`, {
          label: 'Open Folder',
          onClick: () => api?.downloads?.openFolder?.(result.downloadPath)
        })
        // Dispatch event to refresh downloads modal
        window.dispatchEvent(new CustomEvent('download-completed'))
      } else {
        console.error('[ContentPanel] Download failed:', result?.error)
        toaster.showError('Download Failed', `Failed to download file: ${result?.error || 'Unknown error'}`)
      }
    } catch (e) {
      console.error('[ContentPanel] Download error:', e)
      toaster.showError('Download Failed', 'Failed to download file. Please try again.')
    }
  }

  // Actions for preview modal operating on previewNode
  const handleDeletePreviewNode = async () => {
    if (!currentPreviewNode || currentPreviewNode.type !== 'file') return
    const confirmed = window.confirm(`Are you sure you want to delete "${currentPreviewNode.name}"?`)
    if (!confirmed) return
    try {
      const effectiveDriveId = driveId || (window.location.hash.match(/#\/drive\/([^/]+)/)?.[1] ?? null)
      if (!effectiveDriveId || !api?.drives?.deleteFile) return
      const path = currentPreviewNode.id.startsWith('/') ? currentPreviewNode.id : `/${currentPreviewNode.id}`
      const success = await api.drives.deleteFile(effectiveDriveId, path)
      if (success) {
        onFileDeleted?.()
        closePreview()
      } else {
        alert('Failed to delete file. Please try again.')
      }
    } catch (e) {
      console.error('[ContentPanel] Preview delete error:', e)
      alert('An error occurred while deleting the file.')
    }
  }

  const handleDownloadPreviewNode = async () => {
    if (!currentPreviewNode || currentPreviewNode.type !== 'file' || !driveId || !currentDrive) return
    
    try {
      toaster.showInfo('Download Started', `Downloading ${currentPreviewNode.name}...`)
      
      const result = await api?.drives?.downloadFile?.(driveId, currentPreviewNode.id, currentPreviewNode.name, currentDrive.name)
      
      if (result?.success) {
        toaster.showSuccess('Download Complete', `${currentPreviewNode.name} saved to Downloads/HyperTeleporter/${currentDrive.name}/`, {
          label: 'Open Folder',
          onClick: () => api?.downloads?.openFolder?.(result.downloadPath)
        })
        // Dispatch event to refresh downloads modal
        window.dispatchEvent(new CustomEvent('download-completed'))
      } else {
        console.error('[ContentPanel] Download failed:', result?.error)
        toaster.showError('Download Failed', `Failed to download file: ${result?.error || 'Unknown error'}`)
      }
    } catch (e) {
      console.error('[ContentPanel] Preview download error:', e)
      toaster.showError('Download Failed', 'Failed to download file. Please try again.')
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
    const actions: ContextMenuAction[] = []
    if (selectedNode.type === 'file') {
      actions.push(
        { id: 'open', label: 'Open', icon: <IconEye size={16} />, onClick: () => {} },
        { id: 'download', label: 'Download', icon: <IconDownload size={16} />, onClick: handleDownloadFile },
        { id: 'copy', label: 'Copy path', icon: <IconCopy size={16} />, onClick: handleCopyPath },
      )
      if (canWrite) actions.push({ id: 'delete', label: 'Delete', icon: <IconTrash size={16} />, onClick: handleDeleteFile, destructive: true })
    } else {
      if (canWrite) {
        actions.push({ id: 'create-folder', label: 'Create Folder', icon: <IconFolderPlus size={16} />, onClick: () => {
          const currentFolderPath = selectedNode.id === 'virtual-root' ? '/' : selectedNode.id
          onCreateFolder?.(currentFolderPath)
        }})
      }
      actions.push(
        { id: 'download-all', label: 'Download All', icon: <IconDownload size={16} />, onClick: () => onDownloadFolder?.(selectedNode) },
        { id: 'refresh', label: 'Refresh', icon: <IconArrowUp size={16} />, onClick: () => onRefresh?.() },
        { id: 'copy', label: 'Copy path', icon: <IconCopy size={16} />, onClick: handleCopyPath },
      )
    }
    
    // Add Info action for both files and folders
    actions.push({
      id: 'info',
      label: 'Info',
      icon: <IconInfoCircle size={16} />,
      onClick: () => {
        // Show folder/file info preview
        // Create a fake rect for the preview modal (centered on screen)
        const fakeRect = {
          left: window.innerWidth / 2 - 100,
          top: window.innerHeight / 2 - 100,
          width: 200,
          height: 200,
          right: window.innerWidth / 2 + 100,
          bottom: window.innerHeight / 2 + 100,
          x: window.innerWidth / 2 - 100,
          y: window.innerHeight / 2 - 100,
          toJSON: () => fakeRect,
        } as DOMRect
        
        openPreviewFromRect(fakeRect, selectedNode)
      },
    })
    
    return actions
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNode, canWrite])

  const onRightClick = (e: React.MouseEvent) => {
    const menuActions = buildContextActions()
    openContextMenu(e, menuActions)
  }

  const onEmptyAreaRightClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const emptyAreaActions: ContextMenuAction[] = []
    if (canWrite) {
      emptyAreaActions.push({ id: 'create-folder', label: 'Create Folder', icon: <IconFolderPlus size={16} />, onClick: () => {
        const currentFolderPath = selectedNode?.id === 'virtual-root' ? '/' : (selectedNode?.id || '/')
        onCreateFolder?.(currentFolderPath)
      }})
    }
    emptyAreaActions.push({ id: 'refresh', label: 'Refresh', icon: <IconArrowUp size={16} />, onClick: () => {
      onRefresh?.()
    }})
    
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
    <div className={cn("bg-black/5", className)}>
      
      {selectedNode.type === 'folder' ? (
        <div onContextMenu={onRightClick}>
          <FolderContents node={selectedNode} onFileClick={onFileClick} onNavigateUp={onNavigateUp} canNavigateUp={canNavigateUp} driveId={driveId} onFileDeleted={onFileDeleted} onPreviewAnchor={openPreviewFromRect} onDownloadFile={onDownloadFile} onDownloadFolder={onDownloadFolder} canWrite={canWrite} currentDrive={currentDrive} />
        </div>
      ) : (
        // For files, show empty state or parent folder - no file content view
        <div className="flex items-center justify-center text-neutral-500 min-h-[400px]" onContextMenu={onRightClick}>
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-neutral-800/50 flex items-center justify-center">
              <FileIcon node={selectedNode} />
            </div>
            <p className="text-lg font-medium text-white mb-2">{selectedNode.name}</p>
            <p className="text-sm text-neutral-500">File selected - Preview modal will open automatically</p>
          </div>
        </div>
      )}

      {/* Preview Modal with zoom-from-source animation */}
      {currentPreviewNode && (
        <ZoomPreview 
          open={currentIsPreviewOpen} 
          sourceRect={currentPreviewRect} 
          onClose={closePreview} 
          onExited={() => {
            if (!onPreviewAnchor) {
              setInternalPreviewNode(null)
            }
          }}
          rightActions={
            <>
              {currentPreviewNode.type === 'file' && (
                <button 
                  onClick={handleDownloadPreviewNode} 
                  className="text-neutral-300 hover:text-white px-2 py-1"
                  title="Download"
                >
                  <IconDownload size={16} />
                </button>
              )}
              {currentPreviewNode.type === 'file' && canWrite && (
                <button 
                  onClick={handleDeletePreviewNode} 
                  className="text-red-400 hover:text-red-300 px-2 py-1"
                  title="Delete"
                >
                  <IconTrash size={16} />
                </button>
              )}
            </>
          }
        >
          <div className="h-full overflow-hidden flex flex-col">
            {isPreviewLoading ? (
              // Loading state - show spinner
              <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <IconLoader2 className="w-8 h-8 text-neutral-400 animate-spin" />
                  <p className="text-sm text-neutral-500">Loading preview...</p>
                </div>
              </div>
            ) : (
              // Content state - show actual content
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                {/* Upper half: preview or folder cover */}
                <div className="basis-1/2 min-h-0 max-h-1/2  overflow-hidden">
                  {currentPreviewNode.type === 'file' ? (
                    <FilePreview node={currentPreviewNode} insideModal onShowDownloads={onShowDownloads} onClosePreview={onClosePreview} currentDrive={currentDrive} />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center p-8">
                      <img src={FolderIcon} alt="Folder" className="w-20 h-20 opacity-80" />
                    </div>
                  )}
                </div>
                {/* Lower half: metadata/details (scrollable) */}
                <div className="flex-1 min-h-0 overflow-y-auto">
                  {currentPreviewNode.type === 'file' ? (
                    <FileMetadata node={currentPreviewNode} />
                  ) : (
                    <FolderDetails driveId={driveId} folderId={currentPreviewNode.id} />
                  )}
                </div>
              </div>
            )}
          </div>
        </ZoomPreview>
      )}

      <ContextMenu isOpen={isOpen} position={position} actions={actions} onClose={closeContextMenu} />
      <ConfirmDialog />
    </div>
  );
}

function FolderDetails({ driveId, folderId }: { driveId?: string; folderId: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const api: any = (window as any)?.api
  const [stats, setStats] = React.useState<{ files: number; folders: number; sizeBytes: number; createdAt?: string } | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const effectiveDriveId = driveId || (window.location.hash.match(/#\/drive\/([^/]+)/)?.[1] ?? null)
        if (!effectiveDriveId || !api?.drives?.listFolder) {
          setError('Folder info unavailable')
          return
        }
        const folderPath = folderId.startsWith('/') ? folderId : `/${folderId}`
        let createdAt: string | undefined
        try {
          // Get creation time from the .keep file
          const keepFilePath = folderPath.endsWith('/') ? `${folderPath}.keep` : `${folderPath}/.keep`
          console.log(`[FolderDetails] Getting creation time for: ${keepFilePath}`)
          const fileStats = await api.drives.getFileStats(effectiveDriveId, keepFilePath)
          console.log(`[FolderDetails] File stats result:`, fileStats)
          createdAt = fileStats?.createdAt
        } catch (err) {
          console.warn(`[FolderDetails] Failed to get creation time:`, err)
        }
        const stats = await api.drives.getFolderStats(effectiveDriveId, folderPath)
        console.log(`[FolderDetails] Folder stats result:`, stats)
        if (!mounted) return
        setStats({ ...stats, createdAt })
      } catch (e: any) {
        if (!mounted) return
        setError(String(e?.message || e))
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [api, driveId, folderId])

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="text-base md:text-lg font-semibold text-white">Folder Details</h4>
      </div>
      {loading && <div className="text-neutral-300">Loading…</div>}
      {error && <div className="text-red-400">{error}</div>}
      {stats && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="text-xs uppercase tracking-wider text-neutral-400 mb-1">Files</div>
              <div className="text-2xl font-semibold text-white">{stats.files}</div>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="text-xs uppercase tracking-wider text-neutral-400 mb-1">Folders</div>
              <div className="text-2xl font-semibold text-white">{stats.folders}</div>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="text-xs uppercase tracking-wider text-neutral-400 mb-1">Approx Size</div>
              <div className="text-2xl font-semibold text-white">{formatBytes(stats.sizeBytes)}</div>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="text-xs uppercase tracking-wider text-neutral-400 mb-1">Created</div>
              <div className="text-sm font-medium text-neutral-200">{stats.createdAt ? new Date(stats.createdAt).toLocaleString() : '—'}</div>
            </div>
          </div>

          {/* Key/value list (optional extended details) */}
          <div className="bg-white/5 rounded-xl border border-white/10">
            <div className="divide-y divide-white/10">
              <div className="grid grid-cols-3 gap-3 p-3 text-sm">
                <div className="col-span-1 text-neutral-400">Path</div>
                <div className="col-span-2 text-neutral-200 break-all font-mono opacity-80">{folderId}</div>
              </div>
              <div className="grid grid-cols-3 gap-3 p-3 text-sm">
                <div className="col-span-1 text-neutral-400">Items Total</div>
                <div className="col-span-2 text-neutral-200">{stats.files + stats.folders}</div>
              </div>
              {stats.createdAt && (
                <div className="grid grid-cols-3 gap-3 p-3 text-sm">
                  <div className="col-span-1 text-neutral-400">Created</div>
                  <div className="col-span-2 text-neutral-200">{new Date(stats.createdAt).toLocaleDateString()}</div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function ZoomPreview({ open = true, sourceRect, onClose, onExited, rightActions, children }: { open?: boolean; sourceRect: DOMRect | null; onClose: () => void; onExited?: () => void; rightActions?: React.ReactNode; children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false)
  const [viewport, setViewport] = React.useState<{ w: number; h: number }>({ w: window.innerWidth, h: window.innerHeight })

  React.useEffect(() => {
    setMounted(true)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onResize)
    }
  }, [onClose])

  const targetWidth = Math.min(viewport.w - 64, 1000)
  const targetHeight = Math.min(viewport.h - 64, 800)
  const targetX = Math.max(32, Math.floor((viewport.w - targetWidth) / 2))
  const targetY = Math.max(32, Math.floor((viewport.h - targetHeight) / 2))

  const initial = sourceRect
    ? { left: sourceRect.left, top: sourceRect.top, width: sourceRect.width, height: sourceRect.height, opacity: 0 }
    : { left: targetX, top: targetY, width: targetWidth, height: targetHeight, opacity: 0 }

  const animate = { left: targetX, top: targetY, width: targetWidth, height: targetHeight, opacity: 1 }

  return (
    <AnimatePresence onExitComplete={onExited}>
      {mounted && open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5, backdropFilter: 'blur(6px)' as any }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' as any }}
            className="fixed inset-0 z-[100] bg-black/80"
            onClick={onClose}
          />

          {/* Window */}
          <motion.div
            initial={initial}
            animate={animate}
            exit={initial}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="fixed z-[101] rounded-2xl overflow-hidden border border-white/10 bg-neutral-950 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-2 border-b border-white/10">
              <div className="flex items-center gap-1" />
              <div className="flex items-center gap-1">
                {rightActions}
                <button onClick={onClose} className="text-neutral-400 hover:text-white px-2 py-1" title="Close">✕</button>
              </div>
            </div>
            {/* Body */}
            <div className="max-h-[80vh] overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-neutral-800 hover:scrollbar-thumb-neutral-500">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
