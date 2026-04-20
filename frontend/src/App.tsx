import { BrowserRouter } from 'react-router-dom'
import { useAuthInit } from './hooks/useAuthInit'
import { AppRouter } from './router'
import './App.css'

function AppContent() {
  const { ready } = useAuthInit()

  if (!ready) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-header">
            <div className="spinner" style={{ margin: '0 auto' }} />
          </div>
        </div>
      </div>
    )
  }

  return <AppRouter />
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

export default App
