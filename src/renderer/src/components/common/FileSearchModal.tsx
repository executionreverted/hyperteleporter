"use client";

import { useDeferredValue, useMemo, useState } from "react";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalTrigger,
  useModal,
} from "../../../../components/ui/animated-modal";
import { TreeNode } from "../../../../components/ui/tree-view";

type FileResult = {
  node: TreeNode;
  path: string[];
  nameLower: string;
  pathString: string; // pre-joined for render performance
};

function flattenFiles(nodes: TreeNode[], parentPath: string[] = []): FileResult[] {
  const results: FileResult[] = [];
  for (const node of nodes) {
    const currentPath = [...parentPath, node.name];
    if (node.type === "file") {
      results.push({
        node,
        path: currentPath,
        nameLower: node.name.toLowerCase(),
        pathString: currentPath.join(" / "),
      });
    } else if (node.children && node.children.length > 0) {
      results.push(...flattenFiles(node.children, currentPath));
    }
  }
  return results;
}

export function FileSearchModal({
  fileSystem,
  triggerButton,
  onSelect,
}: {
  fileSystem: TreeNode[];
  triggerButton?: React.ReactNode;
  onSelect: (node: TreeNode, path: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const allFiles = useMemo(() => flattenFiles(fileSystem), [fileSystem]);
  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    if (!q) return allFiles.slice(0, 50);
    return allFiles
      .filter(({ nameLower }) => nameLower.includes(q))
      .slice(0, 100);
  }, [allFiles, deferredQuery]);

  function handleSelect(result: FileResult, setOpen: (open: boolean) => void) {
    onSelect(result.node, result.path);
    setOpen(false);
  }

  return (
    <div className="flex items-center">
      <Modal>
        {triggerButton ? (
          <CustomTriggerButton>{triggerButton}</CustomTriggerButton>
        ) : (
          <ModalTrigger className="px-3 py-2 text-sm rounded-lg bg-neutral-800 text-neutral-200 hover:bg-neutral-700 transition-colors">
            Search
          </ModalTrigger>
        )}
        <ModalBody>
          <SearchContent
            query={query}
            setQuery={setQuery}
            filtered={filtered}
            onPick={handleSelect}
          />
        </ModalBody>
      </Modal>
    </div>
  );
}

function CustomTriggerButton({ children }: { children: React.ReactNode }) {
  const { setOpen } = useModal();
  return <div onClick={() => setOpen(true)}>{children}</div>;
}

function SearchContent({
  query,
  setQuery,
  filtered,
  onPick,
}: {
  query: string;
  setQuery: (q: string) => void;
  filtered: FileResult[];
  onPick: (res: FileResult, setOpen: (open: boolean) => void) => void;
}) {
  const { setOpen } = useModal();

  return (
    <>
      <ModalContent>
        <h4 className="text-lg md:text-2xl text-neutral-100 font-bold text-center mb-3">
          Search files
        </h4>
        <p className="text-neutral-400 text-center mb-5">
          Type a filename to quickly jump to it.
        </p>
        <div className="w-full max-w-xl mx-auto">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files by name..."
            className="w-full h-11 px-4 text-sm bg-black/30 border border-white/15 rounded-md text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>
        <div className="mt-5 h-80 overflow-y-auto rounded-md border border-white/10 scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-neutral-800">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-neutral-400">No files found</div>
          ) : (
            <ul className="divide-y divide-white/10">
              {filtered.map((res, idx) => (
                <li key={idx}>
                  <button
                    className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors"
                    onClick={() => onPick(res, setOpen)}
                  >
                    <div className="text-white text-sm">{res.node.name}</div>
                    <div className="text-xs text-neutral-400 truncate">{res.pathString}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </ModalContent>
      <ModalFooter>
        <button
          onClick={() => setOpen(false)}
          className="px-3 py-2 bg-gray-200 text-black dark:bg-black dark:text-white border border-gray-300 dark:border-black rounded-md text-sm"
        >
          Close
        </button>
      </ModalFooter>
    </>
  );
}

export default FileSearchModal;


