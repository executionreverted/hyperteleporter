import React, { useState } from 'react'
import { useAutolaunch } from '../../hooks/useAutolaunch'
import { Switch } from '../../../../components/ui/switch'
import { Label } from '../../../../components/ui/label'
import { MagicButton } from './MagicButton'
import { Info, CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface AutolaunchSettingsProps {
  className?: string
}

export function AutolaunchSettings({ className }: AutolaunchSettingsProps) {
  const { isEnabled, settings, wasLaunchedAtStartup, loading, toggle, refresh } = useAutolaunch()
  const [isToggling, setIsToggling] = useState(false)
  const [showStartupMessage, setShowStartupMessage] = useState(wasLaunchedAtStartup)

  const handleToggle = async () => {
    setIsToggling(true)
    try {
      await toggle({ minimized: false, hidden: false })
    } catch (error) {
      console.error('Failed to toggle autolaunch:', error)
    } finally {
      setIsToggling(false)
    }
  }

  const handleRefresh = async () => {
    await refresh()
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span className="text-sm text-gray-400">Loading autolaunch settings...</span>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Startup Message */}
      {showStartupMessage && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-start space-x-3">
          <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-green-400 font-medium">App launched at startup</p>
            <p className="text-xs text-green-300 mt-1">
              HyperTeleporter started automatically when you turned on your computer.
            </p>
            <MagicButton
              variant="default"
              onClick={() => setShowStartupMessage(false)}
            >
              Dismiss
            </MagicButton>
          </div>
        </div>
      )}

      {/* Main Settings */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="autolaunch-toggle" className="text-sm font-medium">
              Launch at startup
            </Label>
            <p className="text-xs text-gray-400">
              Automatically start HyperTeleporter when you turn on your computer
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {isToggling ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isEnabled ? (
              <CheckCircle className="h-4 w-4 text-green-400" />
            ) : (
              <XCircle className="h-4 w-4 text-gray-400" />
            )}
            <Switch
              id="autolaunch-toggle"
              checked={isEnabled}
              onCheckedChange={handleToggle}
              disabled={isToggling}
            />
          </div>
        </div>

        {/* Current Status */}
        <div className="bg-gray-800/50 rounded-lg p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-300">Current status:</span>
            <span className={`font-medium ${isEnabled ? 'text-green-400' : 'text-gray-400'}`}>
              {isEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          {isEnabled && (
            <div className="mt-2 text-xs text-gray-400">
              <p>• App will start automatically when you log in</p>
              <p>• App will be visible in the system tray</p>
            </div>
          )}
        </div>

        {/* Platform-specific info */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-300">
              <p className="font-medium mb-1">Platform Support:</p>
              <p>• <strong>Windows:</strong> Added to Windows startup folder</p>
              <p>• <strong>macOS:</strong> Added to Login Items in System Preferences</p>
              <p>• <strong>Linux:</strong> Limited support (manual setup required)</p>
            </div>
          </div>
        </div>

        {/* Refresh Button */}
        <div className="flex justify-end">
          <MagicButton
            variant="blue"
            onClick={handleRefresh}
          >
            Refresh Status
          </MagicButton>
        </div>
      </div>
    </div>
  )
}
