import apiClient from './apiClient'

export async function importPublicKey(base64: string): Promise<CryptoKey> {
  const binaryDer = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
  return crypto.subtle.importKey(
    'spki',
    binaryDer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt']
  )
}

export async function encryptWithPublicKey(publicKey: CryptoKey, plaintext: string): Promise<string> {
  if (!plaintext) throw new Error('plaintext must not be empty')
  const encoded = new TextEncoder().encode(plaintext)
  const encrypted = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, encoded)
  return btoa(Array.from(new Uint8Array(encrypted), b => String.fromCharCode(b)).join(''))
}

export async function fetchAndImportPublicKey(): Promise<CryptoKey> {
  const { data } = await apiClient.get('/api/v1/auth/public-key')
  return importPublicKey(data.publicKey)
}
