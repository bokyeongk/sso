import axios from 'axios'
import { authStore } from '../store/authStore'
import { startLogin } from './auth'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
})

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const config = error.config
    const isRefreshRequest = config?.url?.includes('/api/auth/refresh')
    if (error.response?.status === 401 && !config._retry && !isRefreshRequest) {
      config._retry = true
      try {
        await apiClient.post('/api/auth/refresh')
        return apiClient(config)
      } catch {
        authStore.setAuthenticated(false)
        const redirectTo = (error as { response?: { headers?: Record<string, string> } })
          .response?.headers?.['x-redirect-to']
        if (redirectTo) {
          window.location.href = redirectTo
        } else {
          startLogin()
        }
        return Promise.reject(error)
      }
    }
    return Promise.reject(error)
  }
)

export default apiClient
