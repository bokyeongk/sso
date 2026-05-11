import { Routes, Route, Navigate } from 'react-router-dom'
import { HomePage } from '../pages/HomePage'
import { LoginPage } from '../pages/LoginPage'
import { RegisterPage } from '../pages/RegisterPage'
import { GuestRoute } from './GuestRoute'
import { useAuth } from '../hooks/useAuth'

function AuthLoading() {
  return (
    <div className="home-status">
      <div className="spinner" />
    </div>
  )
}

export function AppRouter() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) return <AuthLoading />

  if (isAuthenticated) {
    return (
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
