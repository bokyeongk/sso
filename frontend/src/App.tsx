import { BrowserRouter } from 'react-router-dom'
import { AppRouter } from './router'
import { useAuthInit } from './hooks/useAuthInit'
import { ErrorToast } from './components/ErrorToast'
import './App.css'

function App() {
  useAuthInit()
  return (
    <>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
      <ErrorToast />
    </>
  )
}

export default App
