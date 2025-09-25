import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { IconX, IconCheck, IconAlertCircle, IconInfoCircle, IconDownload } from '@tabler/icons-react'

export interface Toast {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToasterContextType {
  showToast: (toast: Omit<Toast, 'id'>) => void
  hideToast: (id: string) => void
  showSuccess: (title: string, message?: string, action?: Toast['action']) => void
  showError: (title: string, message?: string, action?: Toast['action']) => void
  showInfo: (title: string, message?: string, action?: Toast['action']) => void
  showWarning: (title: string, message?: string, action?: Toast['action']) => void
}

const ToasterContext = createContext<ToasterContextType | undefined>(undefined)

export const useToaster = () => {
  const context = useContext(ToasterContext)
  if (!context) {
    throw new Error('useToaster must be used within a ToasterProvider')
  }
  return context
}

interface ToasterProviderProps {
  children: ReactNode
}

export const ToasterProvider: React.FC<ToasterProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast: Toast = {
      id,
      duration: 5000,
      ...toast,
    }

    setToasts(prev => [...prev, newToast])

    // Auto-hide after duration
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        hideToast(id)
      }, newToast.duration)
    }
  }, [])

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const showSuccess = useCallback((title: string, message?: string, action?: Toast['action']) => {
    showToast({ type: 'success', title, message, action })
  }, [showToast])

  const showError = useCallback((title: string, message?: string, action?: Toast['action']) => {
    showToast({ type: 'error', title, message, action })
  }, [showToast])

  const showInfo = useCallback((title: string, message?: string, action?: Toast['action']) => {
    showToast({ type: 'info', title, message, action })
  }, [showToast])

  const showWarning = useCallback((title: string, message?: string, action?: Toast['action']) => {
    showToast({ type: 'warning', title, message, action })
  }, [showToast])

  const value: ToasterContextType = {
    showToast,
    hideToast,
    showSuccess,
    showError,
    showInfo,
    showWarning,
  }

  return (
    <ToasterContext.Provider value={value}>
      {children}
      <ToasterContainer toasts={toasts} onHide={hideToast} />
    </ToasterContext.Provider>
  )
}

interface ToasterContainerProps {
  toasts: Toast[]
  onHide: (id: string) => void
}

const ToasterContainer: React.FC<ToasterContainerProps> = ({ toasts, onHide }) => {
  return (
    <div className="fixed bottom-4 right-4 z-[200] space-y-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onHide={onHide} />
        ))}
      </AnimatePresence>
    </div>
  )
}

interface ToastItemProps {
  toast: Toast
  onHide: (id: string) => void
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onHide }) => {
  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <IconCheck size={20} className="text-green-400" />
      case 'error':
        return <IconAlertCircle size={20} className="text-red-400" />
      case 'warning':
        return <IconAlertCircle size={20} className="text-yellow-400" />
      case 'info':
        return <IconInfoCircle size={20} className="text-blue-400" />
      default:
        return <IconInfoCircle size={20} className="text-blue-400" />
    }
  }

  const getBackgroundColor = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-900/90 border-green-700'
      case 'error':
        return 'bg-red-900/90 border-red-700'
      case 'warning':
        return 'bg-yellow-900/90 border-yellow-700'
      case 'info':
        return 'bg-black/70 border-white/10'
      default:
        return 'bg-blue-900/90 border-blue-700'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 300, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`pointer-events-auto max-w-sm w-full ${getBackgroundColor()} border rounded-lg shadow-lg backdrop-blur-sm`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-white">
              {toast.title}
            </h4>
            {toast.message && (
              <p className="mt-1 text-sm text-neutral-300">
                {toast.message}
              </p>
            )}
            {toast.action && (
              <button
                onClick={toast.action.onClick}
                className="mt-2 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
              >
                {toast.action.label}
              </button>
            )}
          </div>
          <button
            onClick={() => onHide(toast.id)}
            className="flex-shrink-0 text-neutral-400 hover:text-white transition-colors"
          >
            <IconX size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
