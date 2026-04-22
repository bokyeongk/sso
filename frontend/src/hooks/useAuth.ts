import { useSyncExternalStore } from 'react'
import { authStore } from '../store/authStore'
import apiClient from '../lib/apiClient'

export function useAuth() {
  const { isAuthenticated, user } = useSyncExternalStore(
    authStore.subscribe,
    authStore.getState
  )

  const logout = async () => {
    try {
      await apiClient.post('/logout')
    } catch {
      // 로그아웃 실패해도 로컬 상태는 정리
    }
    authStore.setAuthenticated(false)
  }

  return {
    isAuthenticated,
    user,
    logout,
  }
}
