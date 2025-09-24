"use client";
import { cn } from "../../renderer/lib/utils";
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
  IconFolder, 
  IconDownload, 
  IconShare, 
  IconTrash 
} from "@tabler/icons-react";

interface ContentPanelProps {
  selectedNode?: TreeNode;
  onFileClick?: (node: TreeNode) => void;
  onNavigateUp?: () => void;
  canNavigateUp?: boolean;
  className?: string;
}

const FilePreview = ({ node }: { node: TreeNode }) => {
  const getFileType = () => {
    const extension = node.name.split('.').pop()?.toLowerCase();
    return extension || 'unknown';
  };

  const fileType = getFileType();

  const getMockContent = (ext: string) => {
    switch (ext) {
      case 'json':
        return JSON.stringify({ name: node.name, version: "1.0.0", scripts: { build: "vite build" } }, null, 2);
      case 'js':
      case 'jsx':
        return `export function Hello() {\n  console.log('Hello, world');\n  return <div>Hello</div>;\n}`;
      case 'ts':
      case 'tsx':
        return `type User = { id: string; name: string };\nexport function getUser(id: string): User {\n  return { id, name: 'Ada' };\n}`;
      case 'html':
        return `<div class="card">\n  <h1>Hello</h1>\n  <p>Sample preview</p>\n</div>`;
      case 'css':
        return `.card {\n  color: white;\n  background: #111;\n}`;
      case 'md':
        return `# ${node.name}\n\nPreview of markdown content.`;
      case 'yml':
      case 'yaml':
        return `name: ${node.name}\nversion: 1.0.0`;
      case 'xml':
        return `<note>\n  <to>User</to>\n  <from>Hyperdrive</from>\n</note>`;
      case 'py':
        return `def greet(name: str) -> None:\n    print(f"Hello {name}")`;
      case 'sh':
        return `#!/usr/bin/env bash\necho "Hello"`;
      default:
        return `Preview of ${node.name}`;
    }
  };

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
    const code = getMockContent(ext);
    const language = inferLanguage(ext);
    return (
      <div className="p-6">
        <div className="bg-black/10 rounded-lg p-4 max-h-[480px] overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-neutral-800">
          <div className="text-white mb-3">Code Preview:</div>
          <SyntaxHighlighter
            language={language}
            style={vscDarkPlus}
            customStyle={{ background: 'transparent', margin: 0, padding: '1rem', borderRadius: '0.5rem' }}
            wrapLongLines
          >
            {code}
          </SyntaxHighlighter>
        </div>
      </div>
    );
  };

  const renderPreview = () => {
    switch (fileType) {
      case 'txt':
      case 'md':
        return renderCodePreview(fileType);

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
              <div className="bg-white dark:bg-neutral-700 rounded-lg p-8 flex items-center justify-center max-h-[400px]">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-300 dark:bg-neutral-600 rounded-lg mx-auto mb-4 flex items-center justify-center">
                    <IconPhoto size={32} className="text-gray-500" />
                  </div>
                  <p className="text-sm text-white">Image preview would appear here</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'mp4':
      case 'avi':
      case 'mov':
      case 'mkv':
        return (
          <div className="p-6">
            <div className="bg-gray-100 dark:bg-black/10 rounded-lg p-4 max-h-[480px] overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-neutral-800">
              <div className="text-white mb-4">Video Preview:</div>
              <div className="bg-black rounded-lg p-8 flex items-center justify-center max-h-[400px]">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-700 rounded-lg mx-auto mb-4 flex items-center justify-center">
                    <IconVideo size={32} className="text-white" />
                  </div>
                  <p className="text-sm text-white">Video preview would appear here</p>
                </div>
              </div>
            </div>
          </div>
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

      default:
        return (
          <div className="p-6">
            <div className="bg-gray-100 dark:bg-black/10 rounded-lg p-4 max-h-[480px] overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-neutral-800">
              <div className="text-white mb-4">File Preview:</div>
              <div className="bg-white dark:bg-neutral-700 rounded-lg p-8 flex items-center justify-center max-h-[400px]">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-300 dark:bg-neutral-600 rounded-lg mx-auto mb-4 flex items-center justify-center">
                    <IconFile size={32} className="text-gray-500" />
                  </div>
                  <p className="text-sm text-white">Preview not available for this file type</p>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {renderPreview()}
    </motion.div>
  );
};

const FileMetadata = ({ node }: { node: TreeNode }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-6"
    >
      <div className="bg-black/10 rounded-lg p-6">
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

const FolderContents = ({ node, onFileClick, onNavigateUp, canNavigateUp }: { node: TreeNode; onFileClick?: (node: TreeNode) => void; onNavigateUp?: () => void; canNavigateUp?: boolean }) => {
  const totalItems = node.children ? node.children.length : 0;
  const folderCount = node.children ? node.children.filter(c => c.type === 'folder').length : 0;
  const fileCount = totalItems - folderCount;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-6"
    >
      <div className="bg-black/10 rounded-lg p-6">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {canNavigateUp && (
              <div
                key="pseudo-up"
                className="bg-black/10 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer hover:bg-black/20"
                onClick={() => onNavigateUp?.()}
              >
                <div className="flex items-center gap-3 mb-2">
                  <IconFolder size={20} className="text-neutral-400" />
                  <span className="font-medium text-white truncate">..</span>
                </div>
                <p className="text-sm text-neutral-400">Go to parent folder</p>
              </div>
            )}
            {node.children?.map((child) => (
              <div
                key={child.id}
                className="bg-black/10 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer hover:bg-black/20"
                onClick={() => onFileClick?.(child)}
              >
                <div className="flex items-center gap-3 mb-2">
                  {child.type === 'folder' ? (
                    <IconFolder size={20} className="text-blue-500" />
                  ) : (
                    <IconFile size={20} className="text-neutral-400" />
                  )}
                  <span className="font-medium text-white truncate">
                    {child.name}
                  </span>
                </div>
                {child.size && (
                  <p className="text-sm text-neutral-400">{child.size}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-black/20 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <IconFolder size={32} className="text-neutral-400" />
            </div>
            <p className="text-neutral-400">This folder is empty</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export function ContentPanel({ selectedNode, onFileClick, onNavigateUp, canNavigateUp, className }: ContentPanelProps) {
  if (!selectedNode) {
    return (
      <div className={cn("flex items-center justify-center h-full", className)}>
      <div className="text-center">
        <div className="w-16 h-16 bg-black/20 rounded-lg mx-auto mb-4 flex items-center justify-center">
          <IconFolder size={32} className="text-neutral-400" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">
          Select a file or folder
        </h3>
        <p className="text-neutral-400">
          Choose an item from the sidebar to view its contents or preview
        </p>
      </div>
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
              <MagicButton className="text-sm flex items-center gap-2">
                <IconTrash size={16} />
                Delete
              </MagicButton>
            </div>
          </div>
        </div>
      )}
      
      {selectedNode.type === 'folder' ? (
        <FolderContents node={selectedNode} onFileClick={onFileClick} onNavigateUp={onNavigateUp} canNavigateUp={canNavigateUp} />
      ) : (
        <>
          <FilePreview node={selectedNode} />
          <FileMetadata node={selectedNode} />
        </>
      )}
    </div>
  );
}
