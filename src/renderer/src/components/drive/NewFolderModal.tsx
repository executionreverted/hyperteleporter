import React, { useState, useCallback } from 'react'
import { ModalContent, ModalFooter } from '../../../../components/ui/animated-modal'
import MagicButtonWide from '../../../../components/ui/magic-button-wide'

interface NewFolderModalProps {
  driveId: string
  currentFolder: string
  isOpen: boolean
  onClose: () => void
  onCreated: () => Promise<void>
}

const FormContent = React.memo(({ 
  driveId, 
  currentFolder, 
  onCreated, 
  onClose 
}: { 
  driveId: string
  currentFolder: string
  onCreated: () => Promise<void>
  onClose: () => void
}) => {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  
  const handleCreate = useCallback(async () => {
    if (!name.trim()) return
    
    const folderPath = currentFolder.endsWith('/') 
      ? currentFolder + name.trim() 
      : currentFolder + '/' + name.trim()
    
    try {
      setSaving(true)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api: any = (window as any)?.api
      await api?.drives?.createFolder?.(driveId, folderPath)
      await onCreated()
      onClose()
      setName('') // Reset form
    } finally {
      setSaving(false)
    }
  }, [name, currentFolder, driveId, onCreated, onClose])

  const handleCancel = useCallback(() => {
    onClose()
    setName('') // Reset form
  }, [onClose])

  return (
    <>
      <ModalContent>
        <h4 className="text-lg md:text-2xl text-neutral-100 font-bold text-center mb-4">
          New Folder
        </h4>
        <p className="text-neutral-400 text-center mb-6">
          Create a folder under <span className="font-mono text-white/80">
            {currentFolder || '/'}
          </span>
        </p>
        <div className="max-w-md mx-auto w-full">
          <label className="block text-left text-white/90 mb-2">
            Folder name
          </label>
          <input
            className="w-full rounded-md px-4 py-3 bg-white/10 text-white placeholder-white/50 focus:outline-none"
            placeholder="e.g. Documents"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCreate()
              } else if (e.key === 'Escape') {
                handleCancel()
              }
            }}
            autoFocus
          />
        </div>
      </ModalContent>
      <ModalFooter className="gap-4">
        <MagicButtonWide
          variant="default"
          onClick={handleCancel}
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
})

FormContent.displayName = 'FormContent'

export const NewFolderModal: React.FC<NewFolderModalProps> = ({
  driveId,
  currentFolder,
  isOpen,
  onClose,
  onCreated,
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="fixed inset-0 bg-black/70 bg-opacity-20" 
        onClick={onClose} 
      />
      <div className="relative bg-neutral-950 border border-neutral-800 rounded-2xl max-w-md w-full mx-4">
        <FormContent
          driveId={driveId}
          currentFolder={currentFolder}
          onCreated={onCreated}
          onClose={onClose}
        />
      </div>
    </div>
  )
}
