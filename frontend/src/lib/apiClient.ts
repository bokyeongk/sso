import axios from 'axios'
import keycloak from './keycloak'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
})

apiClient.interceptors.request.use(async (config) => {
  if (keycloak.authenticated) {
    try {
      await keycloak.updateToken(30)
    } catch {
      keycloak.login()
      return Promise.reject(new Error('Token refresh failed'))
    }
    config.headers.Authorization = `Bearer ${keycloak.token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      keycloak.login()
    }
    return Promise.reject(error)
  }
)

export default apiClient
