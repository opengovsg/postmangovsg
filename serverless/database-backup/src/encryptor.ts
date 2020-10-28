import crypto from 'crypto'
import { EventEmitter } from 'events'
import { EncryptionConfig } from './interfaces'

class Encryptor extends EventEmitter {
  algorithm: crypto.CipherGCMTypes
  iv: Buffer
  key: crypto.KeyObject
  authTag?: Buffer

  keyEncryptionPublicKey: crypto.KeyObject
  encryptedKey: Buffer

  constructor(encryptionConfig: EncryptionConfig) {
    super()

    const { keySize, algorithm, keyEncryptionPublicKey } = encryptionConfig

    this.iv = crypto.randomBytes(16)
    this.algorithm = algorithm
    this.key = crypto.createSecretKey(crypto.randomBytes(keySize))

    const publicKeyPem = `-----BEGIN PUBLIC KEY-----\n${keyEncryptionPublicKey}\n-----END PUBLIC KEY-----\n`
    this.keyEncryptionPublicKey = crypto.createPublicKey(publicKeyPem)
    this.encryptedKey = crypto.publicEncrypt(
      {
        key: this.keyEncryptionPublicKey,
        oaepHash: 'sha256',
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      },
      this.key.export()
    )
  }

  encrypt(inputStream: NodeJS.ReadableStream): NodeJS.ReadableStream {
    const cipher = crypto.createCipheriv(this.algorithm, this.key, this.iv)
    cipher.on('error', (err) => this.emit('error', err))
    cipher.on('end', () => {
      this.authTag = cipher.getAuthTag()
    })

    return inputStream.pipe(cipher)
  }

  getEncryptionParams(): {
    algorithm: string
    iv: string
    encryptedKey: string
  } {
    const { algorithm, iv, encryptedKey } = this

    return {
      algorithm: algorithm,
      iv: iv.toString('base64'),
      encryptedKey: encryptedKey.toString('base64'),
    }
  }
}

export default Encryptor
