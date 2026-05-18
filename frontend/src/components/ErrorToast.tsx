import { useEffect, useSyncExternalStore } from 'react'
import { errorStore } from '../store/errorStore'

export function ErrorToast() {
  const { message } = useSyncExternalStore(errorStore.subscribe, errorStore.getState)

  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => {
      errorStore.clearError()
    }, 4000)
    return () => clearTimeout(timer)
  }, [message])

  if (!message) return null

  return (
    <div className="error-toast" role="alert">
      <span className="error-toast-message">{message}</span>
      <button
        className="error-toast-close"
        onClick={() => errorStore.clearError()}
        aria-label="닫기"
      >
        &times;
      </button>
    </div>
  )
}
