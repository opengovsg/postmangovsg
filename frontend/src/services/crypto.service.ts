// require buffer with trailing slash to ensure use of the npm module named buffer
// instead of the node.js core module named buffer
import 'webcrypto-shim/webcrypto-shim'

import { Buffer } from 'buffer/'

const ENCRYPTION_METHOD = 'AES-GCM'
const KEY_DERIVATION_FUNCTION = 'PBKDF2'
const CIPHER_IV_DELIMITER = '.' // '.' used as delimiter since it's not part of base64 charlist
const STRING_ENCODING = 'base64'

// Note: the same password and salt will always give the same derived key
async function deriveKey(
  password: string,
  salt: string,
  iterations = 4000
): Promise<CryptoKey> {
  const passwordBuffer = Buffer.from(password)
  const saltBuffer = Buffer.from(salt)
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    KEY_DERIVATION_FUNCTION,
    false, // extractable option
    ['deriveBits', 'deriveKey'] // possible actions that can be done with the key
  )
  const key = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
  return key
}

async function exportKey(key: CryptoKey): Promise<ArrayBuffer> {
  return window.crypto.subtle.exportKey('raw', key)
}

export async function sha256(key: ArrayBuffer | string): Promise<string> {
  if (typeof key === 'string') {
    key = Buffer.from(key)
  }
  const hashedKey = await crypto.subtle.digest('SHA-256', key)
  return Buffer.from(hashedKey).toString(STRING_ENCODING)
}

function encodeCipherToBase64(cipher: ArrayBuffer, iv: Uint8Array): string {
  const cipherBase64 = Buffer.from(cipher).toString(STRING_ENCODING)
  const ivBase64 = Buffer.from(iv).toString(STRING_ENCODING)

  return `${cipherBase64}${CIPHER_IV_DELIMITER}${ivBase64}`
}

export async function encryptData(
  payload: string,
  password: string,
  salt: string,
  iterations?: number
): Promise<{ encrypted: string; key: ArrayBuffer }> {
  try {
    const iv = window.crypto.getRandomValues(new Uint8Array(12))
    const algorithm = { name: ENCRYPTION_METHOD, iv, tagLength: 128 }
    const derivedKey = await deriveKey(password, salt, iterations)

    const encodedPayload = Buffer.from(payload)
    const cipherBuffer = await window.crypto.subtle.encrypt(
      algorithm,
      derivedKey,
      encodedPayload
    )

    const key = await exportKey(derivedKey)
    return {
      encrypted: encodeCipherToBase64(cipherBuffer, iv),
      key,
    }
  } catch (error) {
    throw new Error(`Error encrypting data: ${(error as Error).message}`)
  }
}

function decodeCipherText(ciphertext: string): { cipher: Buffer; iv: Buffer } {
  const [cipher, iv] = ciphertext.split(CIPHER_IV_DELIMITER)
  const decodedCipher = Buffer.from(cipher, STRING_ENCODING)
  const decodedIv = Buffer.from(iv, STRING_ENCODING)
  return { cipher: decodedCipher, iv: decodedIv }
}

export async function decryptData(
  ciphertext: string,
  password: string,
  salt: string
): Promise<string> {
  try {
    const { cipher, iv } = decodeCipherText(ciphertext)

    const algorithm = { name: ENCRYPTION_METHOD, iv, tagLength: 128 }

    const key = await deriveKey(password, salt)

    const plainBuffer = await window.crypto.subtle.decrypt(
      algorithm,
      key,
      cipher
    )
    const plaintext = Buffer.from(plainBuffer).toString()

    return plaintext
  } catch (error: unknown) {
    throw new Error(`Error decrypting data: ${(error as Error).message}`)
  }
}

export async function hashPassword(
  password: string,
  salt: string
): Promise<string> {
  const cryptoKey = await deriveKey(password, salt)
  const key = await exportKey(cryptoKey)
  const hash = await sha256(key)
  return hash
}
