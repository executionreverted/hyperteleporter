import React, { useState, useMemo } from 'react'
import { IconX, IconSettings, IconTrash, IconDownload, IconUpload, IconBell, IconShield, IconPalette, IconDatabase, IconRocket } from '@tabler/icons-react'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { MagicButton } from './MagicButton'
import { ConfirmDialog } from './ConfirmDialog'
import { AutolaunchSettings } from './AutolaunchSettings'
import { Switch } from '../../../../components/ui/switch'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onClearContent: () => void
}

interface SettingSection {
  id: string
  title: string
  icon: React.ReactNode
  settings: Setting[]
}

interface Setting {
  id: string
  label: string
  description: string
  type: 'toggle' | 'select' | 'input' | 'button'
  value?: any
  options?: { label: string; value: any }[]
  onChange?: (value: any) => void
  onClick?: () => void
  danger?: boolean
}

export function SettingsModal({ isOpen, onClose, onClearContent }: SettingsModalProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  
  const [settings, setSettings] = useState({
    // General Settings
    autoSync: true,
    notifications: true,
    theme: 'dark',
    language: 'en',
    
    // Download Settings
    downloadPath: 'Downloads/HyperTeleporter',
    concurrentDownloads: 5,
    autoOpenFolder: true,
    
    // Upload Settings
    autoCompress: false,
    maxFileSize: '100MB',
    
    // Security Settings
    encryptFiles: false,
    requirePassword: false,
    
    // Advanced Settings
    debugMode: false,
    logLevel: 'info',
    cacheSize: '500MB'
  })

  useEscapeKey({ onEscape: onClose })

  const handleSettingChange = (settingId: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [settingId]: value
    }))
  }

  const handleClearContentClick = () => {
    setShowConfirmDialog(true)
  }

  const handleConfirmClear = async () => {
    setIsClearing(true)
    try {
      await onClearContent()
      setShowConfirmDialog(false)
      onClose() // Close settings modal after clearing
    } catch (error) {
      console.error('Error clearing content:', error)
    } finally {
      setIsClearing(false)
    }
  }

  const handleCancelClear = () => {
    setShowConfirmDialog(false)
  }

  const settingSections: SettingSection[] = useMemo(() => [
    {
      id: 'general',
      title: 'General',
      icon: <IconSettings className="w-5 h-5" />,
      settings: [
        {
          id: 'autoSync',
          label: 'Auto Sync',
          description: 'Automatically sync files when changes are detected (Coming Soon)',
          type: 'toggle',
          value: settings.autoSync,
          onChange: (value) => handleSettingChange('autoSync', value)
        },
        {
          id: 'notifications',
          label: 'Notifications',
          description: 'Show notifications for downloads and uploads (Coming Soon)',
          type: 'toggle',
          value: settings.notifications,
          onChange: (value) => handleSettingChange('notifications', value)
        },
        {
          id: 'theme',
          label: 'Theme',
          description: 'Choose your preferred theme (Coming Soon)',
          type: 'select',
          value: settings.theme,
          options: [
            { label: 'Dark', value: 'dark' },
            { label: 'Light', value: 'light' },
            { label: 'Auto', value: 'auto' }
          ],
          onChange: (value) => handleSettingChange('theme', value)
        },
        {
          id: 'language',
          label: 'Language',
          description: 'Select your preferred language (Coming Soon)',
          type: 'select',
          value: settings.language,
          options: [
            { label: 'English', value: 'en' },
            { label: 'Spanish', value: 'es' },
            { label: 'French', value: 'fr' },
            { label: 'German', value: 'de' }
          ],
          onChange: (value) => handleSettingChange('language', value)
        }
      ]
    },
    {
      id: 'autolaunch',
      title: 'Startup',
      icon: <IconRocket className="w-5 h-5" />,
      settings: []
    },
    {
      id: 'downloads',
      title: 'Downloads',
      icon: <IconDownload className="w-5 h-5" />,
      settings: [
        {
          id: 'downloadPath',
          label: 'Download Path',
          description: 'Default folder for downloaded files (Coming Soon)',
          type: 'input',
          value: settings.downloadPath,
          onChange: (value) => handleSettingChange('downloadPath', value)
        },
        {
          id: 'concurrentDownloads',
          label: 'Concurrent Downloads',
          description: 'Number of simultaneous downloads (Coming Soon)',
          type: 'select',
          value: settings.concurrentDownloads,
          options: [
            { label: '1', value: 1 },
            { label: '3', value: 3 },
            { label: '5', value: 5 },
            { label: '10', value: 10 }
          ],
          onChange: (value) => handleSettingChange('concurrentDownloads', value)
        },
        {
          id: 'autoOpenFolder',
          label: 'Auto Open Folder',
          description: 'Automatically open download folder when complete (Coming Soon)',
          type: 'toggle',
          value: settings.autoOpenFolder,
          onChange: (value) => handleSettingChange('autoOpenFolder', value)
        }
      ]
    },
    {
      id: 'uploads',
      title: 'Uploads',
      icon: <IconUpload className="w-5 h-5" />,
      settings: [
        {
          id: 'autoCompress',
          label: 'Auto Compress',
          description: 'Automatically compress large files before upload (Coming Soon)',
          type: 'toggle',
          value: settings.autoCompress,
          onChange: (value) => handleSettingChange('autoCompress', value)
        },
        {
          id: 'maxFileSize',
          label: 'Max File Size',
          description: 'Maximum file size for uploads (Coming Soon)',
          type: 'select',
          value: settings.maxFileSize,
          options: [
            { label: '10MB', value: '10MB' },
            { label: '50MB', value: '50MB' },
            { label: '100MB', value: '100MB' },
            { label: '500MB', value: '500MB' },
            { label: '1GB', value: '1GB' }
          ],
          onChange: (value) => handleSettingChange('maxFileSize', value)
        }
      ]
    },
    {
      id: 'security',
      title: 'Security',
      icon: <IconShield className="w-5 h-5" />,
      settings: [
        {
          id: 'encryptFiles',
          label: 'Encrypt Files',
          description: 'Encrypt files before uploading to drive (Coming Soon)',
          type: 'toggle',
          value: settings.encryptFiles,
          onChange: (value) => handleSettingChange('encryptFiles', value)
        },
        {
          id: 'requirePassword',
          label: 'Require Password',
          description: 'Require password for sensitive operations (Coming Soon)',
          type: 'toggle',
          value: settings.requirePassword,
          onChange: (value) => handleSettingChange('requirePassword', value)
        }
      ]
    },
    {
      id: 'advanced',
      title: 'Advanced',
      icon: <IconDatabase className="w-5 h-5" />,
      settings: [
        {
          id: 'debugMode',
          label: 'Debug Mode',
          description: 'Enable debug logging and additional information (Coming Soon)',
          type: 'toggle',
          value: settings.debugMode,
          onChange: (value) => handleSettingChange('debugMode', value)
        },
        {
          id: 'logLevel',
          label: 'Log Level',
          description: 'Set the logging verbosity level (Coming Soon)',
          type: 'select',
          value: settings.logLevel,
          options: [
            { label: 'Error', value: 'error' },
            { label: 'Warning', value: 'warn' },
            { label: 'Info', value: 'info' },
            { label: 'Debug', value: 'debug' }
          ],
          onChange: (value) => handleSettingChange('logLevel', value)
        },
        {
          id: 'cacheSize',
          label: 'Cache Size',
          description: 'Maximum cache size for temporary files (Coming Soon)',
          type: 'select',
          value: settings.cacheSize,
          options: [
            { label: '100MB', value: '100MB' },
            { label: '500MB', value: '500MB' },
            { label: '1GB', value: '1GB' },
            { label: '2GB', value: '2GB' }
          ],
          onChange: (value) => handleSettingChange('cacheSize', value)
        }
      ]
    }
  ], [settings])

  const renderSetting = (setting: Setting) => {
    switch (setting.type) {
      case 'toggle':
        return (
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <label className="text-sm font-medium text-white">{setting.label}</label>
              <p className="text-xs text-neutral-400 mt-1">{setting.description}</p>
            </div>
            <Switch
              checked={setting.value}
              onCheckedChange={(checked) => setting.onChange?.(checked)}
              disabled
            />
          </div>
        )

      case 'select':
        return (
          <div className="space-y-2">
            <div>
              <label className="text-sm font-medium text-white">{setting.label}</label>
              <p className="text-xs text-neutral-400 mt-1">{setting.description}</p>
            </div>
            <select
              value={setting.value}
              onChange={(e) => setting.onChange?.(e.target.value)}
              disabled
              className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent opacity-50 cursor-not-allowed"
            >
              {setting.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )

      case 'input':
        return (
          <div className="space-y-2">
            <div>
              <label className="text-sm font-medium text-white">{setting.label}</label>
              <p className="text-xs text-neutral-400 mt-1">{setting.description}</p>
            </div>
            <input
              type="text"
              value={setting.value}
              onChange={(e) => setting.onChange?.(e.target.value)}
              disabled
              className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent opacity-50 cursor-not-allowed"
            />
          </div>
        )

      case 'button':
        return (
          <div className="space-y-2">
            <div>
              <label className="text-sm font-medium text-white">{setting.label}</label>
              <p className="text-xs text-neutral-400 mt-1">{setting.description}</p>
            </div>
            <MagicButton
              onClick={setting.onClick}
              variant={setting.danger ? 'red' : 'blue'}
              disabled
            >
              {setting.label}
            </MagicButton>
          </div>
        )

      default:
        return null
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-neutral-900 rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-700">
          <div className="flex items-center space-x-3">
            <IconSettings className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-semibold text-white">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-700 rounded-lg transition-colors"
          >
            <IconX className="w-5 h-5 text-neutral-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-600 hover:scrollbar-thumb-neutral-500">
          <div className="p-6">
          <div className="space-y-8">
            {settingSections.map((section) => (
              <div key={section.id} className="space-y-4">
                <div className="flex items-center space-x-2 pb-2 border-b border-neutral-700">
                  {section.icon}
                  <h3 className="text-lg font-medium text-white">{section.title}</h3>
                </div>
                
                <div className="space-y-6">
                  {section.id === 'autolaunch' ? (
                    <div className="p-4 bg-neutral-800/50 rounded-lg">
                      <AutolaunchSettings />
                    </div>
                  ) : (
                    section.settings.map((setting) => (
                      <div key={setting.id} className="p-4 bg-neutral-800/50 rounded-lg">
                        {renderSetting(setting)}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}

            {/* Danger Zone */}
            <div className="space-y-4 pt-6 border-t border-red-500/20">
              <div className="flex items-center space-x-2 pb-2">
                <IconTrash className="w-5 h-5 text-red-500" />
                <h3 className="text-lg font-medium text-red-500">Danger Zone</h3>
              </div>
              
              <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium text-red-400">Clear Drive Content</h4>
                    <p className="text-xs text-red-300 mt-1">
                      This will permanently delete all files and folders in the current drive. This action cannot be undone.
                    </p>
                  </div>
                  <MagicButton
                    onClick={handleClearContentClick}
                    variant="red"
                    disabled={isClearing}
                  >
                    <IconTrash className="w-4 h-4 mr-2" />
                    Clear All Content
                  </MagicButton>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-neutral-700">
          <MagicButton
            onClick={onClose}
            variant="default"
          >
            Close
          </MagicButton>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={handleCancelClear}
        onConfirm={handleConfirmClear}
        title="Clear Drive Content"
        message="Are you sure you want to clear all content from this drive? This action cannot be undone and will permanently delete all files and folders."
        confirmText="Clear All Content"
        cancelText="Cancel"
        variant="danger"
        loading={isClearing}
      />
    </div>
  )
}
