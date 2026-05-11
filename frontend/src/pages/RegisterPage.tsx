import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import apiClient from '../lib/apiClient'
import { POSITION_OPTIONS, TEAM_OPTIONS } from '../constants/options'

interface FieldErrors {
  username?: string
  lastName?: string
  firstName?: string
  email?: string
  password?: string
  confirmPassword?: string
  position?: string
  team?: string
  phone?: string
}

export function RegisterPage() {
  const [username, setUsername] = useState('')
  const [lastName, setLastName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [position, setPosition] = useState('')
  const [team, setTeam] = useState('')
  const [phone, setPhone] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const [usernameChecked, setUsernameChecked] = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [usernameChecking, setUsernameChecking] = useState(false)
  const [emailChecked, setEmailChecked] = useState(false)
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null)
  const [emailChecking, setEmailChecking] = useState(false)

  const formatPhone = (value: string): string => {
    const digits = value.replace(/\D/g, '')
    if (digits.length <= 3) return digits
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value))
  }

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value)
    setUsernameChecked(false)
    setUsernameAvailable(null)
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
    setEmailChecked(false)
    setEmailAvailable(null)
  }

  const checkUsername = async () => {
    setUsernameChecking(true)
    try {
      const { data } = await apiClient.get('/api/v1/auth/check-username', { params: { username } })
      setUsernameAvailable(!data.exists)
    } catch {
      setUsernameAvailable(null)
    } finally {
      setUsernameChecked(true)
      setUsernameChecking(false)
    }
  }

  const checkEmail = async () => {
    setEmailChecking(true)
    try {
      const { data } = await apiClient.get('/api/v1/auth/check-email', { params: { email } })
      setEmailAvailable(!data.exists)
    } catch {
      setEmailAvailable(null)
    } finally {
      setEmailChecked(true)
      setEmailChecking(false)
    }
  }

  const validate = (): boolean => {
    const errors: FieldErrors = {}

    if (!/^[a-zA-Z0-9]{4,20}$/.test(username)) {
      errors.username = '아이디는 4~20자 영문·숫자만 입력 가능합니다.'
    } else if (!usernameChecked) {
      errors.username = '아이디 중복 확인을 해주세요.'
    } else if (!usernameAvailable) {
      errors.username = '이미 사용 중인 아이디입니다.'
    }
    if (!lastName.trim()) {
      errors.lastName = '성을 입력해 주세요.'
    }
    if (!firstName.trim()) {
      errors.firstName = '이름을 입력해 주세요.'
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = '올바른 이메일 주소를 입력해 주세요.'
    } else if (!emailChecked) {
      errors.email = '이메일 중복 확인을 해주세요.'
    } else if (!emailAvailable) {
      errors.email = '이미 사용 중인 이메일입니다.'
    }
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password)) {
      errors.password = '비밀번호는 8자 이상 영문·숫자 조합이어야 합니다.'
    }
    if (password !== confirmPassword) {
      errors.confirmPassword = '비밀번호가 일치하지 않습니다.'
    }
    if (!position) {
      errors.position = '직급을 선택해 주세요.'
    }
    if (!team) {
      errors.team = '팀을 선택해 주세요.'
    }
    if (!/^010-\d{4}-\d{4}$/.test(phone)) {
      errors.phone = '올바른 휴대폰번호를 입력해 주세요.'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setServerError(null)

    if (!validate()) return

    setLoading(true)
    try {
      await apiClient.post('/api/v1/auth/register', {
        username,
        password,
        lastName,
        firstName,
        email,
        attributes: {
          rank: position,
          teamId: team,
          telNo: phone,
        },
      })
      navigate('/login', { state: { registered: true } })
    } catch (err: any) {
      const msg = err?.response?.data?.message
      setServerError(msg ?? '회원가입 중 오류가 발생했습니다. 다시 시도해 주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="login-header">
          <h1 className="login-title">회원가입</h1>
          <p className="login-desc">계정을 생성하여 서비스를 이용하세요.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="login-field">
            <label className="login-label" htmlFor="username">아이디</label>
            <div className="input-check-row">
              <input
                id="username"
                className="login-input"
                type="text"
                placeholder="아이디를 입력하세요"
                value={username}
                onChange={handleUsernameChange}
                autoComplete="username"
              />
              <button
                type="button"
                className="check-btn"
                onClick={checkUsername}
                disabled={usernameChecking || !/^[a-zA-Z0-9]{4,20}$/.test(username)}
              >
                {usernameChecking ? '확인 중...' : '중복확인'}
              </button>
            </div>
            {usernameChecked && (
              <p className={usernameAvailable ? 'check-available' : 'auth-field-error'}>
                {usernameAvailable ? '사용 가능한 아이디입니다.' : '이미 사용 중인 아이디입니다.'}
              </p>
            )}
            {fieldErrors.username && !usernameChecked && (
              <p className="auth-field-error">{fieldErrors.username}</p>
            )}
          </div>

          <div className="login-field">
            <label className="login-label" htmlFor="lastName">성</label>
            <input
              id="lastName"
              className="login-input"
              type="text"
              placeholder="성을 입력하세요"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              autoComplete="family-name"
            />
            {fieldErrors.lastName && (
              <p className="auth-field-error">{fieldErrors.lastName}</p>
            )}
          </div>

          <div className="login-field">
            <label className="login-label" htmlFor="firstName">이름</label>
            <input
              id="firstName"
              className="login-input"
              type="text"
              placeholder="이름을 입력하세요"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              autoComplete="given-name"
            />
            {fieldErrors.firstName && (
              <p className="auth-field-error">{fieldErrors.firstName}</p>
            )}
          </div>

          <div className="login-field">
            <label className="login-label" htmlFor="email">이메일</label>
            <div className="input-check-row">
              <input
                id="email"
                className="login-input"
                type="email"
                placeholder="이메일을 입력하세요"
                value={email}
                onChange={handleEmailChange}
                autoComplete="email"
              />
              <button
                type="button"
                className="check-btn"
                onClick={checkEmail}
                disabled={emailChecking || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)}
              >
                {emailChecking ? '확인 중...' : '중복확인'}
              </button>
            </div>
            {emailChecked && (
              <p className={emailAvailable ? 'check-available' : 'auth-field-error'}>
                {emailAvailable ? '사용 가능한 이메일입니다.' : '이미 사용 중인 이메일입니다.'}
              </p>
            )}
            {fieldErrors.email && !emailChecked && (
              <p className="auth-field-error">{fieldErrors.email}</p>
            )}
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
              autoComplete="new-password"
            />
            {fieldErrors.password && (
              <p className="auth-field-error">{fieldErrors.password}</p>
            )}
          </div>

          <div className="login-field">
            <label className="login-label" htmlFor="confirmPassword">비밀번호 확인</label>
            <input
              id="confirmPassword"
              className="login-input"
              type="password"
              placeholder="비밀번호를 다시 입력하세요"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
            {fieldErrors.confirmPassword && (
              <p className="auth-field-error">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          <div className="login-field">
            <label className="login-label" htmlFor="position">직급</label>
            <select
              id="position"
              className="auth-select"
              value={position}
              onChange={e => setPosition(e.target.value)}
            >
              <option value="">직급을 선택하세요</option>
              {POSITION_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            {fieldErrors.position && (
              <p className="auth-field-error">{fieldErrors.position}</p>
            )}
          </div>

          <div className="login-field">
            <label className="login-label" htmlFor="team">팀</label>
            <select
              id="team"
              className="auth-select"
              value={team}
              onChange={e => setTeam(e.target.value)}
            >
              <option value="">팀을 선택하세요</option>
              {TEAM_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            {fieldErrors.team && (
              <p className="auth-field-error">{fieldErrors.team}</p>
            )}
          </div>

          <div className="login-field">
            <label className="login-label" htmlFor="phone">휴대폰번호</label>
            <input
              id="phone"
              className="login-input"
              type="tel"
              placeholder="010-0000-0000"
              value={phone}
              onChange={handlePhoneChange}
              maxLength={13}
              autoComplete="tel"
            />
            {fieldErrors.phone && (
              <p className="auth-field-error">{fieldErrors.phone}</p>
            )}
          </div>

          {serverError && <p className="login-error">{serverError}</p>}

          <button className="login-btn" type="submit" disabled={loading}>
            {loading ? '처리 중...' : '회원가입'}
          </button>
        </form>

        <p className="login-signup">
          이미 계정이 있으신가요?{' '}
          <Link to="/login" className="login-signup-link">로그인</Link>
        </p>
      </div>
    </div>
  )
}
