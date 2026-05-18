import { useEffect, useState } from 'react'
import apiClient from '../../lib/apiClient'
import type { ProfileData, ProfileUpdatePayload } from '../../types/profile'

interface ProfileModalProps {
  onClose: () => void
}

export function ProfileModal({ onClose }: ProfileModalProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState<ProfileData>({
    username: '',
    lastName: '',
    firstName: '',
    email: '',
    telNo: '',
    teamId: '',
    rank: '',
  })

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    setIsLoading(true)
    apiClient.get('/api/v1/profile')
      .then(res => {
        const data: ProfileData = res.data.data
        setForm(data)
      })
      .finally(() => setIsLoading(false))
  }, [])

  const handleChange = (field: keyof ProfileUpdatePayload) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  const handleSubmit = () => {
    const payload: ProfileUpdatePayload = {
      lastName: form.lastName,
      firstName: form.firstName,
      telNo: form.telNo,
      teamId: form.teamId,
      rank: form.rank,
    }
    setIsSubmitting(true)
    apiClient.put('/api/v1/profile', payload)
      .then(() => {
        onClose()
      })
      .finally(() => setIsSubmitting(false))
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">내 정보 수정</h2>

        <div className="login-field">
          <label className="login-label">아이디</label>
          <input
            className="login-input profile-field-readonly"
            type="text"
            value={form.username}
            disabled
          />
        </div>

        <div className="login-field">
          <label className="login-label">성 <span className="required-mark">*</span></label>
          <input
            className="login-input"
            type="text"
            placeholder="성을 입력하세요"
            value={form.lastName}
            onChange={handleChange('lastName')}
            disabled={isLoading}
          />
        </div>

        <div className="login-field">
          <label className="login-label">이름 <span className="required-mark">*</span></label>
          <input
            className="login-input"
            type="text"
            placeholder="이름을 입력하세요"
            value={form.firstName}
            onChange={handleChange('firstName')}
            disabled={isLoading}
          />
        </div>

        <div className="login-field">
          <label className="login-label">이메일</label>
          <input
            className="login-input profile-field-readonly"
            type="text"
            value={form.email}
            disabled
          />
        </div>

        <div className="login-field">
          <label className="login-label">휴대폰번호</label>
          <input
            className="login-input"
            type="text"
            placeholder="010-0000-0000"
            value={form.telNo}
            onChange={handleChange('telNo')}
            disabled={isLoading}
          />
        </div>

        <div className="login-field">
          <label className="login-label">팀ID</label>
          <input
            className="login-input"
            type="text"
            placeholder="팀ID를 입력하세요"
            value={form.teamId}
            onChange={handleChange('teamId')}
            disabled={isLoading}
          />
        </div>

        <div className="login-field">
          <label className="login-label">직급</label>
          <input
            className="login-input"
            type="text"
            placeholder="직급을 입력하세요"
            value={form.rank}
            onChange={handleChange('rank')}
            disabled={isLoading}
          />
        </div>

        <div className="modal-footer">
          <button className="modal-cancel-btn" onClick={onClose}>
            닫기
          </button>
          <button
            className="modal-submit-btn"
            onClick={handleSubmit}
            disabled={isLoading || isSubmitting}
          >
            {isLoading ? '로딩중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
