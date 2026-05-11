import { FormEvent, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import apiClient from '../lib/apiClient'
import { authStore } from '../store/authStore'
import { authFlag } from '../hooks/useAuthInit'

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const registered = location.state?.registered === true

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await apiClient.post('/api/v1/auth/login', { username, password })
      const { data } = await apiClient.get('/api/me')
      authFlag.set()
      authStore.setAuthenticated(true, {
        name: data.name ?? data.preferredUsername ?? data.preferred_username ?? '',
        email: data.email ?? '',
      })
      navigate('/')
    } catch {
      setError('아이디 또는 비밀번호가 올바르지 않습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">Hubilon SSO</h1>
          <p className="login-desc">서비스에 접근하려면 로그인이 필요합니다.</p>
        </div>

        {registered && (
          <p className="auth-success">회원가입이 완료되었습니다. 로그인해 주세요.</p>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label className="login-label" htmlFor="username">아이디</label>
            <input
              id="username"
              className="login-input"
              type="text"
              placeholder="아이디를 입력하세요"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div className="login-field">
            <label className="login-label" htmlFor="password">비밀번호</label>
            <input
              id="password"
              className="login-input"
              type="password"
              placeholder="비밀번호를 입력하세요"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && <p className="login-error">{error}</p>}

          <button className="login-btn" type="submit" disabled={loading}>
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <p className="login-signup">
          계정이 없으신가요?{' '}
          <Link to="/register" className="login-signup-link">회원가입</Link>
        </p>
      </div>
    </div>
  )
}
