import React from 'react'
import { IconTrash, IconX } from '@tabler/icons-react'

interface ClearContentProgressModalProps {
  isOpen: boolean
  currentItem: string
  deletedCount: number
  totalItems: number
  progress: number
}

export function ClearContentProgressModal({
  isOpen,
  currentItem,
  deletedCount,
  totalItems,
  progress
}: ClearContentProgressModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 rounded-xl shadow-2xl w-full max-w-md border border-neutral-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-full bg-red-500/20 text-red-500">
              <IconTrash className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-white">Clearing Drive Content</h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-neutral-400">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-neutral-700 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-red-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Current Item */}
            {currentItem && (
              <div className="space-y-1">
                <p className="text-sm text-neutral-400">Currently deleting:</p>
                <p className="text-sm text-white font-mono bg-neutral-800 px-3 py-2 rounded truncate">
                  {currentItem}
                </p>
              </div>
            )}

            {/* Stats */}
            <div className="flex justify-between text-sm text-neutral-400">
              <span>Deleted: {deletedCount}</span>
              <span>Total: {totalItems}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
