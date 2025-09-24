import { useState, useEffect } from 'react'
import { MultiStepLoader } from '../../../components/ui/multi-step-loader'

const startupSteps = [
  { text: 'Initializing Hyperdrive instances...' },
  { text: 'Loading drive registry...' },
  { text: 'Connecting to P2P network...' },
  { text: 'Ready to share files!' }
]

export function StartupLoader() {
  const [loading, setLoading] = useState(true)
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    // Simulate startup process with realistic timing
    const timeouts = [
      setTimeout(() => setCurrentStep(1), 800),
      setTimeout(() => setCurrentStep(2), 1600),
      setTimeout(() => setCurrentStep(3), 2400),
      setTimeout(() => setLoading(false), 3200)
    ]

    return () => timeouts.forEach(clearTimeout)
  }, [])

  return (
    <MultiStepLoader
      loadingStates={startupSteps}
      loading={loading}
      duration={800}
      loop={false}
    />
  )
}
