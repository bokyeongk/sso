import { useSyncExternalStore } from 'react'
import { authStore } from '../store/authStore'
import { authFlag } from './useAuthInit'

export function useAuth() {
  const { isAuthenticated, isLoading, user } = useSyncExternalStore(
    authStore.subscribe,
    authStore.getState
  )

  const logout = async () => {
    authFlag.clear()
    window.location.href = '/auth/logout'
  }

  return {
    isAuthenticated,
    isLoading,
    user,
    logout,
  }
}
