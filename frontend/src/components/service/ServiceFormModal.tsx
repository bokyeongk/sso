import { useEffect, useState } from 'react'
import type { Service } from '../../types/service'
import type { ServicePayload } from '../../hooks/useServiceMutations'

interface ServiceFormModalProps {
  mode: 'create' | 'edit'
  initialData?: Service
  onClose: () => void
  onSubmit: (payload: ServicePayload) => void
  isSubmitting: boolean
}

export function ServiceFormModal({
  mode,
  initialData,
  onClose,
  onSubmit,
  isSubmitting,
}: ServiceFormModalProps) {
  const [name, setName] = useState(initialData?.name ?? '')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [url, setUrl] = useState(initialData?.url ?? '')
  const [status, setStatus] = useState<ServicePayload['status']>(
    initialData?.status ?? 'RUNNING'
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleSubmit = () => {
    onSubmit({ name, description, url, status })
  }

  const isNameEmpty = name.trim() === ''
  const isUrlEmpty = url.trim() === ''

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">
          {mode === 'create' ? '서비스 등록' : '서비스 수정'}
        </h2>

        <div className="login-field">
          <label className="login-label">서비스명 <span className="required-mark">*</span></label>
          <input
            className="login-input"
            type="text"
            placeholder="서비스명을 입력하세요"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        <div className="login-field">
          <label className="login-label">설명</label>
          <textarea
            className="modal-textarea"
            placeholder="서비스 설명을 입력하세요"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>

        <div className="login-field">
          <label className="login-label">URL <span className="required-mark">*</span></label>
          <input
            className="login-input"
            type="text"
            placeholder="https://example.com"
            value={url}
            onChange={e => setUrl(e.target.value)}
          />
        </div>

        <div className="login-field">
          <label className="login-label">상태</label>
          <select
            className="auth-select"
            value={status}
            onChange={e => setStatus(e.target.value as ServicePayload['status'])}
          >
            <option value="RUNNING">구동중</option>
            <option value="STOPPED">중지됨</option>
            <option value="MAINTENANCE">점검중</option>
          </select>
        </div>

        <div className="modal-footer">
          <button className="modal-cancel-btn" onClick={onClose}>
            취소
          </button>
          <button
            className="modal-submit-btn"
            onClick={handleSubmit}
            disabled={isNameEmpty || isUrlEmpty || isSubmitting}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  )
}
