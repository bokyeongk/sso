import { useEffect, useState } from 'react'
import apiClient from '../lib/apiClient'
import { authStore } from '../store/authStore'

export function useAuthInit() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (window.location.pathname === '/callback' || window.location.pathname === '/login') {
      setReady(true)
      return
    }

    apiClient.get<{ success: boolean; data: { name: string; email: string } | null }>('/api/auth/me')
      .then(res => {
        authStore.setAuthenticated(true, res.data.data)
      })
      .catch((error: unknown) => {
        authStore.setAuthenticated(false)
        const axiosError = error as { response?: { headers?: Record<string, string> } }
        const redirectTo = axiosError.response?.headers?.['x-redirect-to']
        if (redirectTo) {
          window.location.href = redirectTo
        }
      })
      .finally(() => {
        setReady(true)
      })
  }, [])

  return { ready }
}
