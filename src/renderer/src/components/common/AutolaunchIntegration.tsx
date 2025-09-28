import React, { useState, useEffect } from 'react'
import { useAutolaunch } from '../../hooks/useAutolaunch'
import { AutolaunchOnboarding } from './AutolaunchOnboarding'

interface AutolaunchIntegrationProps {
  children: React.ReactNode
  showOnboarding?: boolean
}

export function AutolaunchIntegration({ children, showOnboarding = true }: AutolaunchIntegrationProps) {
  const { wasLaunchedAtStartup, loading } = useAutolaunch()
  const [showOnboardingModal, setShowOnboardingModal] = useState(false)
  const [hasShownOnboarding, setHasShownOnboarding] = useState(false)

  useEffect(() => {
    // Check if we should show onboarding
    if (showOnboarding && !loading && !hasShownOnboarding) {
      // Show onboarding if:
      // 1. User just installed the app (no autolaunch preference set yet)
      // 2. App was launched at startup (good time to ask about autolaunch)
      // 3. User hasn't seen onboarding before
      const shouldShow = wasLaunchedAtStartup || (!localStorage.getItem('autolaunch-onboarding-shown'))
      
      if (shouldShow) {
        setShowOnboardingModal(true)
      }
    }
  }, [showOnboarding, loading, wasLaunchedAtStartup, hasShownOnboarding])

  const handleOnboardingComplete = () => {
    setShowOnboardingModal(false)
    setHasShownOnboarding(true)
    localStorage.setItem('autolaunch-onboarding-shown', 'true')
  }

  const handleOnboardingSkip = () => {
    setShowOnboardingModal(false)
    setHasShownOnboarding(true)
    localStorage.setItem('autolaunch-onboarding-shown', 'true')
  }

  if (loading) {
    return <>{children}</>
  }

  return (
    <>
      {children}
      
      {showOnboardingModal && (
        <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <AutolaunchOnboarding
              onComplete={handleOnboardingComplete}
              onSkip={handleOnboardingSkip}
            />
          </div>
        </div>
      )}
    </>
  )
}

