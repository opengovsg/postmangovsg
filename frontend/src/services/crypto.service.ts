// require buffer module explicitly to ensure use of the npm module named buffer
// instead of the node.js core module named buffer
import { Buffer } from 'buffer/'
import 'webcrypto-shim/webcrypto-shim'

const ENCRYPTION_METHOD = 'AES-GCM'

async function importKey(password: string) {
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

function encodeCipherToBase64(buffer: ArrayBuffer, iv: Uint8Array) {
  const bufferBase64 = Buffer.from(buffer).toString('base64')
  const ivBase64 = Buffer.from(iv).toString('base64')

  return `${bufferBase64}.${ivBase64}`
}

export async function encryptData(payload: string, password: string) {
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

function decodeCipherText(
  ciphertext: string
): { cipher: Uint8Array; iv: Uint8Array } {
  const [cipher, iv] = ciphertext.split('.')
  const decodedCipher = new Buffer(cipher, 'base64')
  const decodedIv = new Buffer(iv, 'base64')

  return { cipher: decodedCipher, iv: decodedIv }
}

export async function decryptData(ciphertext: string, password: string) {
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
