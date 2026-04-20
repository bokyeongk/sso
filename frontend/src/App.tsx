import { useKeycloak } from './hooks/useKeycloak'
import { LoginButton } from './components/common/LoginButton'
import { HomePage } from './pages/HomePage'
import './App.css'

function App() {
  const { keycloak, initialized, authenticated } = useKeycloak()

  if (!initialized) return null

  if (authenticated) return <HomePage />

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">통합 로그인</h1>
          <p className="login-desc">Hubilon SSO 서비스에 오신 것을 환영합니다</p>
        </div>
        <LoginButton keycloak={keycloak} disabled={!initialized} />
      </div>
    </div>
  )
}

export default App
