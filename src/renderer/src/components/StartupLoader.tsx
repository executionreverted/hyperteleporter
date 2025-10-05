import { useState, useEffect } from 'react'
import { MultiStepLoader } from '../../../components/ui/multi-step-loader'
import { TeleportLogo } from '../components/common/TeleportLogo'

const startupSteps = [
  { text: 'Initializing Hyperdrive instances...' },
  { text: 'Loading drive registry...' },
  { text: 'Connecting to P2P network...' },
  { text: 'Ready to share files!' }
]

export function StartupLoader() {
  const [loading, setLoading] = useState(true)
  const [currentStep, setCurrentStep] = useState(0)
  const [logoDone, setLogoDone] = useState(false)

  useEffect(() => {
    let mounted = true;
    let stepTimeouts: NodeJS.Timeout[] = [];
    let fallbackTimeout: NodeJS.Timeout;
    
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
      
      const handleDrivesInitialized = () => {
        if (mounted) {
          setCurrentStep(3); // Ensure we're on the last step
          const finish = () => mounted && setLoading(false)
          if (logoDone) finish()
          else {
            // wait for logo to complete as well
            const waitLogo = setInterval(() => {
              if (!mounted) return clearInterval(waitLogo)
              if (logoDone) {
                clearInterval(waitLogo)
                finish()
              }
            }, 50)
          }
        }
      };

      if (ipcRenderer) {
        // Listen for the drives initialization event
        ipcRenderer.on('drives:initialized', handleDrivesInitialized);
        
        // Fallback timeout in case event doesn't fire
        fallbackTimeout = setTimeout(() => {
          if (!mounted) return
          setCurrentStep(3)
          // also gate on logo completion
          const finish = () => mounted && setLoading(false)
          if (logoDone) finish()
          else {
            const waitLogo = setInterval(() => {
              if (!mounted) return clearInterval(waitLogo)
              if (logoDone) {
                clearInterval(waitLogo)
                finish()
              }
            }, 50)
          }
        }, 10000); // 10 second fallback
      } else {
        // Fallback to timeout if IPC not available
        fallbackTimeout = setTimeout(() => {
          if (mounted) {
            setCurrentStep(3);
            setLoading(false);
          }
        }, 3200);
      }
    };

    startSteps();
    checkDrivesReady();

    return () => {
      mounted = false;
      stepTimeouts.forEach(clearTimeout);
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
      
      const { ipcRenderer } = (window as any).electron || {};
      if (ipcRenderer) {
        try {
          ipcRenderer.removeListener('drives:initialized', () => {});
        } catch {}
      }
    };
  }, [])

  return (
    <div className="relative w-full h-full">
      <MultiStepLoader
        loadingStates={startupSteps}
        loading={loading}
        duration={800}
        loop={false}
        currentStep={currentStep}
      >
        <div className="w-[50vw] max-w-[720px] min-w-[320px]">
          <TeleportLogo
            fill
            containerSize="100%"
            autoplay
            loop={false}
            onComplete={() => {
              setLogoDone(true)
              window.dispatchEvent(new CustomEvent('startup-logo-complete'))
            }}
          />
        </div>
      </MultiStepLoader>
    </div>
  )
}
