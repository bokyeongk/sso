import { Routes, Route, Navigate } from 'react-router-dom'
import { HomePage } from '../pages/HomePage'
import { CallbackPage } from '../pages/CallbackPage'
import { useAuth } from '../hooks/useAuth'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/callback" element={<CallbackPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function LoginPage() {
  const { isAuthenticated, login } = useAuth()
  if (isAuthenticated) return <Navigate to="/" replace />
  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">통합 로그인</h1>
          <p className="login-desc">Hubilon SSO 서비스에 오신 것을 환영합니다</p>
        </div>
        <button className="login-btn" onClick={login}>로그인</button>
      </div>
    </div>
  )
}
