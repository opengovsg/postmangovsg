import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import stream from 'stream'
import util from 'util'

import { KeyManagementServiceClient } from '@google-cloud/kms'
import config from './config'

const pipeline = util.promisify(stream.pipeline)

interface DumpParams {
  filename: string
  authTag: string
}

interface EncryptionParams {
  algorithm: crypto.CipherGCMTypes
  iv: string
  encryptedKey: string
}

interface Params {
  encryption: EncryptionParams
  dumps: Array<DumpParams>
}

const encryptedDumpFile = 'postman.dump'
const paramsFile = 'postman.json'
const decryptedDumpFile = 'postman.decrypted.dump'

const client = new KeyManagementServiceClient()

async function decryptKeyEncryptionKey(ciphertext: Buffer) {
  if (config.get('gcloudPrivateKeyResourceId')) {
    console.log('Decrypting using GCP KMS')
    const [result] = await client.asymmetricDecrypt({
      name: config.get('gcloudPrivateKeyResourceId'),
      ciphertext,
    })

    return result.plaintext
  }

  console.log('Decrypting using local private key')
  const key = crypto.createPrivateKey(fs.readFileSync(config.get('privateKey')))
  const decrypted = crypto.privateDecrypt(
    {
      key,
      oaepHash: 'sha256',
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    },
    ciphertext
  )
  return decrypted
}

export async function decrypt() {
  const params: Params = JSON.parse(fs.readFileSync(paramsFile, 'utf8'))
  const encryptionParams = params.encryption
  const dumpFilename = path.basename(encryptedDumpFile)
  const dumpParams = params.dumps
    .filter((d) => d.filename === dumpFilename)
    .pop()
  if (!dumpParams || !dumpParams.authTag) {
    throw new Error(`Error: Auth tag not available for ${dumpFilename}`)
  }

  const encryptedKey = Buffer.from(encryptionParams.encryptedKey, 'base64')
  const decryptionKey = await decryptKeyEncryptionKey(encryptedKey)
  if (!decryptionKey) {
    throw new Error('Error: Failed to decrypt key')
  }

  const inputFileStream = fs.createReadStream(encryptedDumpFile)
  const outputFileStream = fs.createWriteStream(decryptedDumpFile)
  const iv = Buffer.from(encryptionParams.iv, 'base64')
  const decipher = crypto.createDecipheriv(
    encryptionParams.algorithm,
    decryptionKey,
    iv
  )
  decipher.setAuthTag(Buffer.from(dumpParams.authTag, 'base64'))


  await pipeline(inputFileStream, decipher, outputFileStream)
  console.log(`Success: ${encryptedDumpFile} decrypted to ${decryptedDumpFile}`)
}
