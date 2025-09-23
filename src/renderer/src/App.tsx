import Versions from './components/Versions'
import electronLogo from './assets/electron.svg'
import { Welcome } from './components/Welcome'
import { DrivesList } from './components/common/Drives'
import { DrivesProvider } from './contexts/DrivesContext'
import { Route, Routes, Link } from 'react-router-dom'

function App(): React.JSX.Element {
  // @ts-ignore
  const ipcHandle = (): void => window.electron.ipcRenderer.send('ping')

  return (
    <DrivesProvider>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/drives" element={<DrivesList />} />
        <Route path="/about" element={<div className="p-4 text-white">About page</div>} />
        <Route path="/versions" element={<Versions />} />
        <Route path="*" element={<div className="p-4 text-white">Not found</div>} />
      </Routes>
    </DrivesProvider>
  )
}

export default App
