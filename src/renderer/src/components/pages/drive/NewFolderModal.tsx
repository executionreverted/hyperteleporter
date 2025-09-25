"use client";
import { useState } from "react";
import { ModalContent, ModalFooter } from "../../../../../components/ui/animated-modal";
import MagicButtonWide from "../../../../../components/ui/magic-button-wide";

export function NewFolderModal({ driveId, currentFolder, onCreated, trigger, isOpen, onClose, onOpen }: { driveId: string, currentFolder: string, onCreated: () => Promise<void>, trigger: React.ReactNode, isOpen: boolean, onClose: () => void, onOpen: () => void }) {
  function FormContent() {
    const [name, setName] = useState("");
    const [saving, setSaving] = useState(false);

    async function handleCreate() {
      if (!name.trim()) return;
      // The caller handles create folder via DrivePage logic
      try {
        setSaving(true);
        await onCreated();
        onClose();
        setName("");
      } finally {
        setSaving(false);
      }
    }

    return (
      <>
        <ModalContent>
          <h4 className="text-lg md:text-2xl text-neutral-100 font-bold text-center mb-4">New Folder</h4>
          <p className="text-neutral-400 text-center mb-6">Create a folder under <span className="font-mono text-white/80">{currentFolder || '/'}</span></n p>
          <div className="max-w-md mx-auto w-full">
            <label className="block text-left text-white/90 mb-2">Folder name</label>
            <input
              className="w-full rounded-md px-4 py-3 bg-white/10 text-white placeholder-white/50 focus:outline-none"
              placeholder="e.g. Documents"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </ModalContent>
        <ModalFooter className="gap-4">
          <MagicButtonWide
            variant="default"
            onClick={() => {
              onClose();
              setName("");
            }}
          >
            Cancel
          </MagicButtonWide>
          <MagicButtonWide
            variant="green"
            onClick={handleCreate}
            disabled={saving || !name.trim()}
            loading={saving}
          >
            Create
          </MagicButtonWide>
        </ModalFooter>
      </>
    )
  }

  return (
    <>
      {trigger}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/70 bg-opacity-20" onClick={onClose} />
          <div className="relative bg-neutral-950 border border-neutral-800 rounded-2xl max-w-md w-full mx-4">
            <FormContent />
          </div>
        </div>
      )}
    </>
  )
}

export default NewFolderModal;


