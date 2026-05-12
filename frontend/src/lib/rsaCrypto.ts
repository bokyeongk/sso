import * as forge from 'node-forge'
import apiClient from './apiClient'

function encryptWithForge(publicKeyBase64: string, plaintext: string): string {
  const derBytes = forge.util.decode64(publicKeyBase64)
  const asn1Obj = forge.asn1.fromDer(derBytes)
  const publicKey = forge.pki.publicKeyFromAsn1(asn1Obj) as forge.pki.rsa.PublicKey
  const encrypted = publicKey.encrypt(
    forge.util.encodeUtf8(plaintext),
    'RSA-OAEP',
    {
      md: forge.md.sha256.create(),
      mgf1: { md: forge.md.sha256.create() },
    }
  )
  return forge.util.encode64(encrypted)
}

export async function encryptWithPublicKey(publicKeyBase64: string, plaintext: string): Promise<string> {
  if (!plaintext) throw new Error('plaintext must not be empty')
  // if(crypto?.subtle){
  //   return encryptWithSubtle(publicKeyBase64, plaintext)
  // }
  return encryptWithForge(publicKeyBase64, plaintext)
}

export async function fetchPublicKeyBase64(): Promise<string> {
  const { data } = await apiClient.get('/api/v1/auth/public-key')
  return data.publicKey
}
