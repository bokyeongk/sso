import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import apiClient from '../lib/apiClient'
import { useRsaEncrypt } from '../hooks/useRsaEncrypt'

interface FieldErrors {
  username?: string
  lastName?: string
  firstName?: string
  email?: string
  password?: string
  confirmPassword?: string
  phone?: string
}

const EMAIL_LOCAL_PATTERN = /^[a-zA-Z0-9._+\-]+$/

const DOMAIN_OPTIONS = [
  { value: 'naver.com',   label: 'naver.com' },
  { value: 'gmail.com',   label: 'gmail.com' },
  { value: 'kakao.com',   label: 'kakao.com' },
  { value: 'hubilon.com', label: 'hubilon.com' },
  { value: 'custom',      label: '직접입력' },
]

const pwRules = [
  { key: 'length', label: '8자 이상',  test: (pw: string) => pw.length >= 8 },
  { key: 'letter', label: '영문 포함', test: (pw: string) => /[A-Za-z]/.test(pw) },
  { key: 'number', label: '숫자 포함', test: (pw: string) => /\d/.test(pw) },
]

export function RegisterPage() {
  const [username, setUsername] = useState('')
  const [lastName, setLastName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [emailLocal, setEmailLocal] = useState('')
  const [emailDomain, setEmailDomain] = useState('naver.com')
  const [customDomain, setCustomDomain] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [confirmTouched, setConfirmTouched] = useState(false)
  const navigate = useNavigate()

  const { encrypt, invalidate } = useRsaEncrypt()

  const [usernameChecked, setUsernameChecked] = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [usernameChecking, setUsernameChecking] = useState(false)
  const [emailChecked, setEmailChecked] = useState(false)
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null)
  const [emailChecking, setEmailChecking] = useState(false)

  const email = emailLocal
    ? `${emailLocal}@${emailDomain === 'custom' ? customDomain : emailDomain}`
    : ''

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

  const resetEmailCheck = () => {
    setEmailChecked(false)
    setEmailAvailable(null)
    setFieldErrors(prev => ({ ...prev, email: undefined }))
  }

  const handleEmailLocalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmailLocal(e.target.value)
    resetEmailCheck()
  }

  const handleEmailDomainChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setEmailDomain(e.target.value)
    resetEmailCheck()
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value)
    setPasswordTouched(true)
  }

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value)
    setConfirmTouched(true)
  }

  const checkUsername = async () => {
    setUsernameChecking(true)
    try {
      const { data } = await apiClient.get('/auth/check-username', { params: { username } })
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
      const { data } = await apiClient.get('/auth/check-email', { params: { email } })
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
    if (!emailLocal) {
      errors.email = '이메일을 입력해 주세요.'
    } else if (!EMAIL_LOCAL_PATTERN.test(emailLocal)) {
      errors.email = '이메일 아이디에 사용할 수 없는 문자가 포함되어 있습니다.'
    } else if (emailDomain === 'custom' && !/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(customDomain)) {
      errors.email = '올바른 도메인 형식을 입력해 주세요. (예: example.com)'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
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
    if (!/^010-\d{4}-\d{4}$/.test(phone)) {
      errors.phone = '올바른 휴대폰번호를 입력해 주세요.'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    setServerError(null)

    if (!validate()) return

    setLoading(true)

    const attemptRegister = async (retried = false): Promise<void> => {
      try {
        const encryptedPassword = await encrypt(password)
        await apiClient.post('/api/v1/auth/register', {
          username,
          password: encryptedPassword,
          lastName,
          firstName,
          email,
          attributes: {
            telNo: phone,
          },
        })
        navigate('/login', { state: { registered: true } })
      } catch (err: any) {
        const msg = err?.response?.data?.message
        if (!retried && msg === '비밀번호 복호화에 실패했습니다.') {
          invalidate()
          return attemptRegister(true)
        }
        setServerError(msg ?? '회원가입 처리 중 오류가 발생했습니다.')
      }
    }

    try {
      await attemptRegister()
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
            <label className="login-label">성명</label>
            <div className="name-row">
              <div className="name-col">
                <input className="login-input" placeholder="성" value={lastName}
                  onChange={e => setLastName(e.target.value)} autoComplete="family-name" />
                {fieldErrors.lastName && <p className="auth-field-error">{fieldErrors.lastName}</p>}
              </div>
              <div className="name-col">
                <input className="login-input" placeholder="이름" value={firstName}
                  onChange={e => setFirstName(e.target.value)} autoComplete="given-name" />
                {fieldErrors.firstName && <p className="auth-field-error">{fieldErrors.firstName}</p>}
              </div>
            </div>
          </div>

          <div className="login-field">
            <label className="login-label">이메일</label>
            <div className="email-input-row">
              <input
                className="login-input email-local-input"
                type="text"
                placeholder="이메일"
                value={emailLocal}
                onChange={handleEmailLocalChange}
                autoComplete="email"
              />
              <span className="email-at">@</span>
              <select
                className="auth-select email-domain-select"
                value={emailDomain}
                onChange={handleEmailDomainChange}
              >
                {DOMAIN_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <button
                type="button"
                className="check-btn email-check-btn"
                onClick={checkEmail}
                disabled={emailChecking || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)}
              >
                {emailChecking ? '확인 중...' : '중복확인'}
              </button>
            </div>
            {emailDomain === 'custom' && (
              <input
                className="login-input"
                style={{ marginTop: 6 }}
                type="text"
                placeholder="도메인을 입력하세요 (예: example.com)"
                value={customDomain}
                onChange={e => { setCustomDomain(e.target.value); resetEmailCheck() }}
              />
            )}
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
              onChange={handlePasswordChange}
              autoComplete="new-password"
            />
            <ul className="pw-rules">
              {pwRules.map(rule => (
                <li
                  key={rule.key}
                  className={`pw-rule${passwordTouched ? (rule.test(password) ? ' pw-rule--pass' : ' pw-rule--fail') : ''}`}
                >
                  {rule.label}
                </li>
              ))}
            </ul>
          </div>

          <div className="login-field">
            <label className="login-label" htmlFor="confirmPassword">비밀번호 확인</label>
            <input
              id="confirmPassword"
              className="login-input"
              type="password"
              placeholder="비밀번호를 다시 입력하세요"
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              autoComplete="new-password"
            />
            {confirmTouched && confirmPassword && (
              <p className={password === confirmPassword ? 'check-available' : 'auth-field-error'}>
                {password === confirmPassword ? '비밀번호가 일치합니다.' : '비밀번호가 일치하지 않습니다.'}
              </p>
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
