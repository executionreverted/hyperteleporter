import React from 'react'
import { IconAlertTriangle, IconX } from '@tabler/icons-react'
import { MagicButton } from './MagicButton'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'danger'
  loading?: boolean
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  loading = false
}: ConfirmDialogProps) {
  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-neutral-900 rounded-xl shadow-2xl w-full max-w-md border border-neutral-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-700">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-full ${
              variant === 'danger' 
                ? 'bg-red-500/20 text-red-500' 
                : 'bg-blue-500/20 text-blue-500'
            }`}>
              <IconAlertTriangle className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-700 rounded-lg transition-colors"
            disabled={loading}
          >
            <IconX className="w-4 h-4 text-neutral-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-neutral-300 leading-relaxed">{message}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-neutral-700">
          <MagicButton
            onClick={onClose}
            variant="default"
            disabled={loading}
          >
            {cancelText}
          </MagicButton>
          <MagicButton
            onClick={onConfirm}
            variant={variant === 'danger' ? 'red' : 'blue'}
            loading={loading}
            disabled={loading}
          >
            {confirmText}
          </MagicButton>
        </div>
      </div>
    </div>
  )
}
