import Versions from './components/Versions'
import electronLogo from './assets/electron.svg'
import { Welcome } from './components/Welcome'
import { DrivesList } from './components/common/Drives'
import { DrivePage } from './components/pages/DrivePage'
import { DrivesProvider } from './contexts/DrivesContext'
import { HyperdriveProvider, useHyperdrive } from './contexts/HyperdriveContext'
import { ToasterProvider } from './contexts/ToasterContext'
import { StartupLoader } from './components/StartupLoader'
import { Route, Routes, Link, Navigate, useLocation } from 'react-router-dom'

function AppContent(): React.JSX.Element {
  const { isInitializing, hasUsername, loaded } = useHyperdrive()
  const location = useLocation()

  console.log('[AppContent] Render - isInitializing:', isInitializing, 'hasUsername:', hasUsername, 'loaded:', loaded, 'location:', location.pathname)

  if (isInitializing) {
    console.log('[AppContent] Showing StartupLoader')
    return <StartupLoader />
  }

  // Wait for profile to be loaded before making routing decisions
  if (!loaded) {
    console.log('[AppContent] Profile not loaded yet, showing StartupLoader')
    return <StartupLoader />
  }

  // If we have a username, redirect to drives (bypass welcome)
  if (hasUsername && location.pathname === '/') {
    console.log('[AppContent] Has username and on welcome page, redirecting to drives')
    return <Navigate to="/drives" replace />
  }

  // Username guard: redirect to Welcome page if no username and not already on Welcome page
  if (!hasUsername && location.pathname !== '/') {
    console.log('[AppContent] No username, redirecting to Welcome page')
    return <Navigate to="/" replace />
  }

  console.log('[AppContent] Rendering main app routes')

  return (
    <DrivesProvider>
      <ToasterProvider>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/drives" element={<DrivesList />} />
          <Route path="/drive/:driveId" element={<DrivePage />} />
          <Route path="/about" element={<div className="p-4 text-white">About page</div>} />
          <Route path="/versions" element={<Versions />} />
          <Route path="*" element={<div className="p-4 text-white">Not found</div>} />
        </Routes>
      </ToasterProvider>
    </DrivesProvider>
  )
}

function App(): React.JSX.Element {
  // @ts-ignore
  const ipcHandle = (): void => window.electron.ipcRenderer.send('ping')

  return (
    <HyperdriveProvider>
      <AppContent />
    </HyperdriveProvider>
  )
}

export default App
