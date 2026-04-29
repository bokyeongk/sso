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
      const res = await apiClient.post<{ loginUrl: string }>('/auth/logout')
      console.log(res)
      // authStore.setAuthenticated(false)
      // const loginUrl = res.data?.loginUrl
      // if (loginUrl) {
      // refresh 실패 → 로그인 페이지로
      window.location.href = 'http://localhost:8080/auth/login'
      // } else {
      //   window.location.href = '/'
      // }
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
