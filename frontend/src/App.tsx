import { BrowserRouter } from 'react-router-dom'
import { AppRouter } from './router'
import { useAuthInit } from './hooks/useAuthInit'
import './App.css'

function App() {
  useAuthInit()
  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  )
}

export default App
