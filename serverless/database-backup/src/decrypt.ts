import crypto from 'crypto'
import fs from 'fs'
import stream from 'stream'
import util from 'util'

import yargs from 'yargs'
import { KeyManagementServiceClient } from '@google-cloud/kms'

const pipeline = util.promisify(stream.pipeline)

interface EncryptionParams {
  algorithm: crypto.CipherGCMTypes
  iv: string
  authTag: string
  encryptedKey: string
}

const argv = yargs
  .option('input', {
    type: 'string',
    demandOption: true,
    description: 'input file to be decrypted',
  })
  .option('params', {
    type: 'string',
    demandOption: true,
    description: 'path to params file',
  })
  .option('output', {
    type: 'string',
    default: 'postman.decrypted.dump',
    description: 'path to write decrypted file to ',
  })
  .option('privateKey', {
    type: 'string',
    default: '',
    description: 'path to local private key to use for decryption',
  })
  .option('kmsKey', {
    type: 'string',
    default: '',
    description: 'GCP resource ID of key to used for decryption',
  }).argv

const client = new KeyManagementServiceClient()

async function decryptKeyEncryptionKey(ciphertext: Buffer) {
  if (argv.kmsKey) {
    console.log('Decrypting using GCP KMS')
    const [result] = await client.asymmetricDecrypt({
      name: argv.kmsKey,
      ciphertext,
    })

    return result.plaintext
  }

  console.log('Decrypting using local private key')
  const key = crypto.createPrivateKey(fs.readFileSync(argv.privateKey))
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

async function decrypt() {
  const params: EncryptionParams = JSON.parse(
    fs.readFileSync(argv.params, 'utf8')
  )

  const encryptedKey = Buffer.from(params.encryptedKey, 'base64')
  const decryptionKey = await decryptKeyEncryptionKey(encryptedKey)
  if (!decryptionKey) {
    throw new Error('Error: Failed to decrypt key')
  }

  const inputFileStream = fs.createReadStream(argv.input)
  const outputFileStream = fs.createWriteStream(argv.output)
  const iv = Buffer.from(params.iv, 'base64')
  const decipher = crypto.createDecipheriv(params.algorithm, decryptionKey, iv)
  decipher.setAuthTag(Buffer.from(params.authTag, 'base64'))

  await pipeline(inputFileStream, decipher, outputFileStream)
  console.log(`Success: ${argv.input} decrypted to ${argv.output}`)
}

decrypt().catch((err) => console.error(err))
