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
    let mounted = true;
    let stepTimeouts: NodeJS.Timeout[] = [];
    
    // Start the step progression
    const startSteps = () => {
      stepTimeouts = [
        setTimeout(() => mounted && setCurrentStep(1), 800),
        setTimeout(() => mounted && setCurrentStep(2), 1600),
        setTimeout(() => mounted && setCurrentStep(3), 2400),
      ];
    };

    // Listen for drives initialization completion
    const checkDrivesReady = () => {
      const { ipcRenderer } = (window as any).electron || {};
      if (!ipcRenderer) {
        // Fallback to timeout if IPC not available
        setTimeout(() => mounted && setLoading(false), 3200);
        return;
      }

      const handleDrivesInitialized = () => {
        console.log('[StartupLoader] Received drives:initialized event');
        if (mounted) {
          setCurrentStep(3); // Ensure we're on the last step
          console.log('[StartupLoader] Setting loading to false in 500ms');
          setTimeout(() => {
            if (mounted) {
              console.log('[StartupLoader] Setting loading to false now');
              setLoading(false);
            }
          }, 500); // Brief delay to show completion
        }
      };

      // Listen for the drives initialization event
      ipcRenderer.on('drives:initialized', handleDrivesInitialized);
      
      // Fallback timeout in case event doesn't fire
      const fallbackTimeout = setTimeout(() => {
        console.log('[StartupLoader] Fallback timeout - drives may not be ready');
        if (mounted) {
          setCurrentStep(3);
          setLoading(false);
        }
      }, 10000); // 10 second fallback

      return () => {
        try {
          ipcRenderer.removeListener('drives:initialized', handleDrivesInitialized);
        } catch {}
        clearTimeout(fallbackTimeout);
      };
    };

    startSteps();
    const cleanup = checkDrivesReady();

    return () => {
      mounted = false;
      stepTimeouts.forEach(clearTimeout);
      if (cleanup) cleanup();
    };
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
