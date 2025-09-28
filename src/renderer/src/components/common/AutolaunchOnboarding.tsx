import React, { useState } from 'react'
import { useAutolaunch } from '../../hooks/useAutolaunch'
import { MagicButton } from './MagicButton'
import { CheckCircle, XCircle, Loader2, Zap } from 'lucide-react'

interface AutolaunchOnboardingProps {
  onComplete: () => void
  onSkip: () => void
}

export function AutolaunchOnboarding({ onComplete, onSkip }: AutolaunchOnboardingProps) {
  const { isEnabled, toggle, loading } = useAutolaunch()
  const [isToggling, setIsToggling] = useState(false)
  const [userChoice, setUserChoice] = useState<'enabled' | 'disabled' | null>(null)

  const handleEnable = async () => {
    setIsToggling(true)
    setUserChoice('enabled')
    try {
      await toggle({ minimized: false, hidden: false })
      setTimeout(() => {
        onComplete()
      }, 1000) // Brief delay to show success
    } catch (error) {
      console.error('Failed to enable autolaunch:', error)
      setIsToggling(false)
      setUserChoice(null)
    }
  }

  const handleDisable = async () => {
    setUserChoice('disabled')
    onComplete()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin mr-3" />
        <span className="text-gray-400">Checking autolaunch settings...</span>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto">
          <Zap className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white">Stay Connected</h2>
        <p className="text-gray-400">
          Would you like HyperTeleporter to start automatically when you turn on your computer?
        </p>
      </div>

      {/* Benefits */}
      <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-medium text-white">Benefits of autolaunch:</h3>
        <ul className="space-y-2 text-sm text-gray-300">
          <li className="flex items-start space-x-2">
            <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
            <span>Your drives stay synced automatically</span>
          </li>
          <li className="flex items-start space-x-2">
            <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
            <span>Files are always available when you need them</span>
          </li>
          <li className="flex items-start space-x-2">
            <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
            <span>No need to remember to start the app</span>
          </li>
        </ul>
      </div>

      {/* Status Display */}
      {userChoice && (
        <div className={`rounded-lg p-4 flex items-center space-x-3 ${
          userChoice === 'enabled' 
            ? 'bg-green-500/10 border border-green-500/20' 
            : 'bg-gray-500/10 border border-gray-500/20'
        }`}>
          {isToggling ? (
            <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
          ) : userChoice === 'enabled' ? (
            <CheckCircle className="h-5 w-5 text-green-400" />
          ) : (
            <XCircle className="h-5 w-5 text-gray-400" />
          )}
          <div>
            <p className={`text-sm font-medium ${
              userChoice === 'enabled' ? 'text-green-400' : 'text-gray-400'
            }`}>
              {userChoice === 'enabled' ? 'Autolaunch enabled!' : 'Autolaunch skipped'}
            </p>
            <p className="text-xs text-gray-400">
              {userChoice === 'enabled' 
                ? 'HyperTeleporter will start automatically'
                : 'You can enable this later in settings'
              }
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        <MagicButton
          onClick={handleEnable}
          disabled={isToggling || userChoice !== null}
        >
          {isToggling ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Enabling...
            </>
          ) : (
            'Yes, start automatically'
          )}
        </MagicButton>
        
        <MagicButton
          onClick={handleDisable}
          disabled={isToggling || userChoice !== null}
          variant="default"
        >
          No, start manually
        </MagicButton>
        
        <MagicButton
          onClick={onSkip}
          disabled={isToggling}
          variant="default"
        >
          Skip for now
        </MagicButton>
      </div>

      {/* Note */}
      <p className="text-xs text-gray-500 text-center">
        You can change this setting anytime in the app preferences
      </p>
    </div>
  )
}
