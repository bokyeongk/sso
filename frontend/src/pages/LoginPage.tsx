import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import apiClient from '../lib/apiClient'
import { authStore } from '../store/authStore'
import { authFlag } from '../hooks/useAuthInit'
import { useRsaEncrypt } from '../hooks/useRsaEncrypt'
import {errorStore} from "../store/errorStore.ts";

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const registered = location.state?.registered === true
  const { encrypt, invalidate } = useRsaEncrypt()

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    errorStore.setError(null)
    setLoading(true)

    const attemptLogin = async (retried = false): Promise<void> => {
      try {
        const encryptedPassword = await encrypt(password)
        await apiClient.post('/api/v1/auth/login', { username, password: encryptedPassword })
        const { data } = await apiClient.get('/api/me')
        authFlag.set()
        authStore.setAuthenticated(true, {
          name: data.username ?? data.preferredUsername ?? data.preferred_username ?? '',
          email: data.email ?? '',
          roles: Array.isArray(data.roles) ? data.roles : [],
        })
        navigate('/')
      } catch (err: any) {
        const msg = err?.response?.data?.message
        if (!retried && msg === '비밀번호 복호화에 실패했습니다.') {
          invalidate()
          return attemptLogin(true)
        }
        errorStore.setError(msg ?? '로그인 처리 중 오류가 발생했습니다.')
      }
    }

    try {
      await attemptLogin()
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
