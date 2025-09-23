import Versions from './components/Versions'
import electronLogo from './assets/electron.svg'
import { Welcome } from './components/Welcome'

function App(): React.JSX.Element {
  // @ts-ignore
  const ipcHandle = (): void => window.electron.ipcRenderer.send('ping')

  return (
    <>
      <Welcome />
    </>
  )
}

export default App
