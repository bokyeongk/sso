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
    apiClient.get('/api/me')
      .then(res => {
        const me = res.data.data
        authFlag.set()
        authStore.setAuthenticated(true, {
          name: me.name ?? '',
          email: me.email ?? '',
          roles: Array.isArray(me.roles) ? me.roles : [],
        })
      })
      .catch(() => {
        authFlag.clear()
        authStore.setAuthenticated(false)
      })
  }, [])
}
