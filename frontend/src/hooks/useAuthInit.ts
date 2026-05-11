import { useEffect } from 'react'
import apiClient from '../lib/apiClient'
import { authStore } from '../store/authStore'

const FLAG_KEY = 'sso_logged_in'

export const authFlag = {
  set: () => localStorage.setItem(FLAG_KEY, '1'),
  clear: () => localStorage.removeItem(FLAG_KEY),
  exists: () => localStorage.getItem(FLAG_KEY) === '1',
}

export function useAuthInit() {
  useEffect(() => {
    if (!authFlag.exists()) {
      authStore.setAuthenticated(false)
      return
    }

    apiClient.get('/api/me')
      .then(res => {
        const d = res.data
        authStore.setAuthenticated(true, {
          name: d.name ?? d.preferredUsername ?? d.preferred_username ?? '',
          email: d.email ?? '',
        })
      })
      .catch(() => {
        authFlag.clear()
        authStore.setAuthenticated(false)
      })
  }, [])
}
