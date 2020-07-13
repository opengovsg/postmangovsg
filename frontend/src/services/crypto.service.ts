// require buffer with trailing slash to ensure use of the npm module named buffer
// instead of the node.js core module named buffer
import { Buffer } from 'buffer/'
import 'webcrypto-shim/webcrypto-shim'
import bcryptjs from 'bcryptjs'

const ENCRYPTION_METHOD = 'AES-GCM'
const CIPHER_IV_DELIMITER = '.' // '.' used as delimiter since it's not part of base64 charlist
const STRING_ENCODING = 'base64'
const SALT_ROUNDS = 4
const DERIVED_KEY_ALGO = 'PBKDF2'
const ITERATIONS = 7000

async function importKey(password: string, salt: string): Promise<CryptoKey> {
  const pwUtf8 = Buffer.from(password)
  const saltBuffer = Buffer.from(salt)

  // Derive a PBKDF2 key from the given password in bytes
  const key = await window.crypto.subtle.importKey(
    'raw',
    pwUtf8,
    DERIVED_KEY_ALGO,
    false,
    ['deriveKey']
  )

  // Create and return an AES-GCM key that can be used for encryption as well as decryption
  return await window.crypto.subtle.deriveKey(
    {
      name: DERIVED_KEY_ALGO,
      salt: saltBuffer,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    key,
    { name: ENCRYPTION_METHOD, length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
}

function encodeCipherToBase64(cipher: ArrayBuffer, iv: Uint8Array): string {
  const cipherBase64 = Buffer.from(cipher).toString(STRING_ENCODING)
  const ivBase64 = Buffer.from(iv).toString(STRING_ENCODING)

  return `${cipherBase64}${CIPHER_IV_DELIMITER}${ivBase64}`
}

export async function encryptData(
  payload: string,
  password: string,
  salt: string
): Promise<string> {
  try {
    const iv = window.crypto.getRandomValues(new Uint8Array(12))
    const algorithm = { name: ENCRYPTION_METHOD, iv, tagLength: 128 }
    const key = await importKey(password, salt)

    const encodedPayload = Buffer.from(payload)
    const cipherBuffer = await window.crypto.subtle.encrypt(
      algorithm,
      key,
      encodedPayload
    )

    return encodeCipherToBase64(cipherBuffer, iv)
  } catch (error) {
    throw new Error(`Error encrypting data: ${error.message}`)
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

    const key = await importKey(password, salt)

    const plainBuffer = await window.crypto.subtle.decrypt(
      algorithm,
      key,
      cipher
    )
    const plaintext = Buffer.from(plainBuffer).toString()

    return plaintext
  } catch (error) {
    throw new Error(`Error decrypting data: ${error.message}`)
  }
}

export async function hashData(text: string, salt: string): Promise<string> {
  return await bcryptjs.hash(text, salt)
}

export async function genSalt(): Promise<string> {
  return bcryptjs.genSalt(SALT_ROUNDS)
}
