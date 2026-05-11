import { fetchAndImportPublicKey, encryptWithPublicKey } from '../lib/rsaCrypto'

let cachedKey: CryptoKey | null = null

export function useRsaEncrypt() {
  const encrypt = async (plaintext: string): Promise<string> => {
    if (!cachedKey) {
      cachedKey = await fetchAndImportPublicKey()
    }
    return encryptWithPublicKey(cachedKey, plaintext)
  }

  const invalidate = () => {
    cachedKey = null
  }

  return { encrypt, invalidate }
}
