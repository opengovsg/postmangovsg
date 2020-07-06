// require buffer with trailing slash to ensure use of the npm module named buffer
// instead of the node.js core module named buffer
import { Buffer } from 'buffer/'
import 'webcrypto-shim/webcrypto-shim'
import bcryptjs from 'bcryptjs'

const ENCRYPTION_METHOD = 'AES-GCM'
const CIPHER_IV_DELIMITER = '.' // '.' used as delimiter since it's not part of base64 charlist
const STRING_ENCODING = 'base64'

async function importKey(password: string): Promise<CryptoKey> {
  const pwUtf8 = Buffer.from(password)
  const pwHash = await window.crypto.subtle.digest('SHA-256', pwUtf8)
  const key = await window.crypto.subtle.importKey(
    'raw',
    pwHash,
    ENCRYPTION_METHOD,
    false, // extractable option
    ['encrypt', 'decrypt'] // possible actions that can be done with the key
  )
  return key
}

function encodeCipherToBase64(cipher: ArrayBuffer, iv: Uint8Array): string {
  const cipherBase64 = Buffer.from(cipher).toString(STRING_ENCODING)
  const ivBase64 = Buffer.from(iv).toString(STRING_ENCODING)

  return `${cipherBase64}${CIPHER_IV_DELIMITER}${ivBase64}`
}

export async function encryptData(
  payload: string,
  password: string
): Promise<string> {
  try {
    const iv = window.crypto.getRandomValues(new Uint8Array(12))
    const algorithm = { name: ENCRYPTION_METHOD, iv, tagLength: 128 }
    const key = await importKey(password)

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
  password: string
): Promise<string> {
  try {
    const { cipher, iv } = decodeCipherText(ciphertext)

    const algorithm = { name: ENCRYPTION_METHOD, iv, tagLength: 128 }

    const key = await importKey(password)

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

export async function hashData(text: string): Promise<string> {
  return await bcryptjs.hash(text, 1)
}
