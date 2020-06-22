import 'webcrypto-shim/webcrypto-shim'

const ENCRYPTION_METHOD = 'AES-GCM'

async function importKey(password: string) {
  const pwUtf8 = new TextEncoder().encode(password)
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

function encodeCipherToString(buffer: ArrayBuffer, iv: Uint8Array) {
  // convert to byte array
  const byteArray = Array.from(new Uint8Array(buffer))
  // convert byte array to string
  const cipherString = byteArray
    .map((byte) => String.fromCharCode(byte))
    .join('')
  // encode string to base64
  const cipherBase64 = btoa(cipherString)
  // convert iv to hex string
  const ivHex = Array.from(iv)
    .map((b) => ('00' + b.toString(16)).slice(-2))
    .join('')

  return `${ivHex}.${cipherBase64}`
}

export async function encryptData(payload: string, password: string) {
  try {
    const initializationVector = window.crypto.getRandomValues(
      new Uint8Array(12)
    )
    const algorithm = {
      name: ENCRYPTION_METHOD,
      iv: initializationVector,
      tagLength: 128,
    }
    const key = await importKey(password)

    const encodedPayload = new TextEncoder().encode(payload)
    const cipherBuffer = await window.crypto.subtle.encrypt(
      algorithm,
      key,
      encodedPayload
    )

    return encodeCipherToString(cipherBuffer, initializationVector)
  } catch (error) {
    throw new Error(`Error encrypting data: ${error.message}`)
  }
}

function decodeCipherText(
  ciphertext: string
): { cipher: Uint8Array; iv: Uint8Array } {
  const [iv, cipher] = ciphertext.split('.')
  const ivBytes = iv.match(/.{2}/g)
  if (!ivBytes) throw Error('Error decoding initialization vector')
  const decodedIv = new Uint8Array(ivBytes.map((byte) => parseInt(byte, 16)))
  const cipherBytes = atob(cipher).match(/[\s\S]/g)
  if (!cipherBytes) throw Error('Error decoding cipher text')
  const decodedCipher = new Uint8Array(
    cipherBytes.map((ch) => ch.charCodeAt(0))
  )

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
    const plaintext = new TextDecoder().decode(plainBuffer) // decode password from UTF-8

    return plaintext
  } catch (error) {
    throw new Error(`Error decrypting data: ${error.message}`)
  }
}
