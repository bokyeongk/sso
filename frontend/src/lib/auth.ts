import { generateCodeVerifier, generateCodeChallenge } from './pkce'
import apiClient from './apiClient'

export async function startLogin(): Promise<void> {
  const verifier = await generateCodeVerifier()
  const challenge = await generateCodeChallenge(verifier)
  sessionStorage.setItem('pkce_verifier', verifier)

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
    redirect_uri: import.meta.env.VITE_REDIRECT_URI,
    scope: 'openid profile email',
    code_challenge: challenge,
    code_challenge_method: 'S256',
  })

  const authorizeUrl = `${import.meta.env.VITE_KEYCLOAK_URL}/realms/${import.meta.env.VITE_KEYCLOAK_REALM}/protocol/openid-connect/auth`
  window.location.href = `${authorizeUrl}?${params.toString()}`
}

export async function startLogout(): Promise<void> {
  try {
    await apiClient.post('/api/auth/logout')
  } catch {
    // 로그아웃 실패해도 로컬 상태는 정리
  }
}
