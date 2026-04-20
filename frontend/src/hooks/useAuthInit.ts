import { useEffect, useState } from 'react'
import apiClient from '../lib/apiClient'
import { authStore } from '../store/authStore'

export function useAuthInit() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (window.location.pathname === '/callback') {
      setReady(true)
      return
    }

    apiClient.get<{ success: boolean; data: { name: string; email: string } | null }>('/api/auth/me')
      .then(res => {
        authStore.setAuthenticated(true, res.data.data)
      })
      .catch(() => {
        authStore.setAuthenticated(false)
      })
      .finally(() => {
        setReady(true)
      })
  }, [])

  return { ready }
}
