import { useSyncExternalStore } from 'react'
import { authStore } from '../store/authStore'
import { startLogin, startLogout } from '../lib/auth'

export function useAuth() {
  const { isAuthenticated, user } = useSyncExternalStore(
    authStore.subscribe,
    authStore.getState
  )

  return {
    isAuthenticated,
    user,
    login: startLogin,
    logout: async () => {
      await startLogout()
      authStore.setAuthenticated(false)
      window.location.href = '/login'
    },
  }
}
