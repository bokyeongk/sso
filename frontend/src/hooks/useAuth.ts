import { useSyncExternalStore } from 'react'
import { authStore } from '../store/authStore'
import apiClient, { isSafeRedirectUrl } from '../lib/apiClient'

export function useAuth() {
  const { isAuthenticated, user } = useSyncExternalStore(
    authStore.subscribe,
    authStore.getState
  )

  const logout = async () => {
    try {
      const res = await apiClient.post<{ loginUrl: string }>('/api/logout')
      authStore.setAuthenticated(false)
      const loginUrl = res.data?.loginUrl
      if (loginUrl && isSafeRedirectUrl(loginUrl)) {
        window.location.href = loginUrl
      } else {
        window.location.href = '/'
      }
    } catch {
      authStore.setAuthenticated(false)
      window.location.href = '/'
    }
  }

  return {
    isAuthenticated,
    user,
    logout,
  }
}
