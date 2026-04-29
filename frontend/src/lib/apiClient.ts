import axios from 'axios'

// X-Redirect-To는 게이트웨이(신뢰된 서버)가 설정하므로 http/https 스킴 검증만 수행.
// javascript: 등 위험 스킴을 차단하여 XSS 리다이렉트를 방지한다.
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

apiClient.interceptors.response.use(
  (res) => res,
  (error) => {

    if (error.response?.status === 401) {

        window.location.href = 'http://localhost:8080/auth/login'
        return Promise.reject(error)
    }
    //   const redirectTo: string | undefined = error.response?.headers?.['x-redirect-to']
    //   if (redirectTo && isSafeRedirectUrl(redirectTo)) {
    //     window.location.href = redirectTo
    //     return new Promise(() => {})
    //   }
    // }
    // return Promise.reject(error)

    if (error.response?.status === 403) {

        return Promise.reject(error)
    }
    //   const redirectTo: string | undefined = error.response?.headers?.['x-redirect-to']
    //   if (redirectTo && isSafeRedirectUrl(redirectTo)) {
    //     window.location.href = redirectTo
    //     return new Promise(() => {})
    //   }
    // }
    // return Promise.reject(error)
  }
)

export default apiClient
