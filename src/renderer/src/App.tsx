import Versions from './components/Versions'
import electronLogo from './assets/electron.svg'
import { Welcome } from './components/Welcome'
import { DrivesList } from './components/common/Drives'
import { DrivePage } from './components/pages/DrivePage'
import { DrivesProvider } from './contexts/DrivesContext'
import { HyperdriveProvider, useHyperdrive } from './contexts/HyperdriveContext'
import { StartupLoader } from './components/StartupLoader'
import { Route, Routes, Link } from 'react-router-dom'

function AppContent(): React.JSX.Element {
  const { isInitializing } = useHyperdrive()

  if (isInitializing) {
    return <StartupLoader />
  }

  return (
    <DrivesProvider>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/drives" element={<DrivesList />} />
        <Route path="/drive/:driveId" element={<DrivePage />} />
        <Route path="/about" element={<div className="p-4 text-white">About page</div>} />
        <Route path="/versions" element={<Versions />} />
        <Route path="*" element={<div className="p-4 text-white">Not found</div>} />
      </Routes>
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
