import axios from 'axios'
import { errorStore } from '../store/errorStore'

type QueueItem = { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }
let isRefreshing = false
let refreshQueue: QueueItem[] = []

export function isSafeRedirectUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function getCookie(name: string): string | undefined {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith(name + '='))
    ?.split('=')[1]
}

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
})

apiClient.interceptors.request.use(config => {
  const method = config.method?.toUpperCase()
  if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
    const csrfToken = getCookie('XSRF-TOKEN')
    if (csrfToken) {
      config.headers['X-XSRF-TOKEN'] = csrfToken
    }
  }
  return config
})

const skipRefreshUrls = ['/auth/login', '/auth/refresh']

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error?.response?.status
    const originalRequest = error?.config
    const requestUrl: string = originalRequest?.url ?? ''

    if (
      status === 401 &&
      !skipRefreshUrls.some(url => requestUrl.includes(url)) &&
      !originalRequest?._retry
    ) {
      originalRequest._retry = true

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({
            resolve: () => resolve(apiClient(originalRequest)),
            reject,
          })
        })
      }

      isRefreshing = true
      try {
        await apiClient.post('/auth/refresh')
        refreshQueue.forEach(({ resolve }) => resolve(undefined))
        refreshQueue = []
        return apiClient(originalRequest)
      } catch (refreshError) {
        refreshQueue.forEach(({ reject }) => reject(refreshError))
        refreshQueue = []
        errorStore.setError('토큰이 만료되어 로그아웃 처리되었습니다.')
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
        originalRequest._retry = false
      }
    }

    if (status !== 401) {
      const message = error?.response?.data?.message ?? '서버에 연결할 수 없습니다.'
      errorStore.setError(message)
    }

    return Promise.reject(error)
  }
)

export default apiClient
