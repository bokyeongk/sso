import { fetchPublicKeyBase64, encryptWithPublicKey } from '../lib/rsaCrypto'

let cachedKey: string | null = null

export function useRsaEncrypt() {
  const encrypt = async (plaintext: string): Promise<string> => {
    if (!cachedKey) {
      cachedKey = await fetchPublicKeyBase64()
    }
    return encryptWithPublicKey(cachedKey, plaintext)
  }

  const invalidate = () => {
    cachedKey = null
  }

  return { encrypt, invalidate }
}
