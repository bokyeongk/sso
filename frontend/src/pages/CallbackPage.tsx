import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../lib/apiClient'
import { authStore } from '../store/authStore'

export function CallbackPage() {
  const navigate = useNavigate()
  const called = useRef(false)

  useEffect(() => {
    if (called.current) return
    called.current = true

    const params = new URLSearchParams(window.location.search)
    const error = params.get('error')
    const code = params.get('code')
    const verifier = sessionStorage.getItem('pkce_verifier')

    if (error || !code || !verifier) {
      sessionStorage.removeItem('pkce_verifier')
      navigate('/', { replace: true })
      return
    }

    const exchange = async () => {
      try {
        await apiClient.post('/api/auth/token', { code, codeVerifier: verifier })
        const meRes = await apiClient.get<{ success: boolean; data: { name: string; email: string } }>('/api/auth/me')
        authStore.setAuthenticated(true, meRes.data.data)
        navigate('/', { replace: true })
      } catch {
        navigate('/', { replace: true })
      } finally {
        sessionStorage.removeItem('pkce_verifier')
      }
    }

    exchange()
  }, [navigate])

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <p className="login-desc">로그인 처리 중...</p>
          <div className="spinner" style={{ margin: '16px auto 0' }} />
        </div>
      </div>
    </div>
  )
}
