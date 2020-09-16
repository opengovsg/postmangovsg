import crypto from 'crypto'
import fs from 'fs'
import stream from 'stream'
import util from 'util'

interface EncryptionParams {
  algorithm: crypto.CipherGCMTypes
  iv: string
  authTag: string
  encryptedKey: string
}

const pipeline = util.promisify(stream.pipeline)

const INPUT_FILE = process.env.INPUT_FILE || 'postman.dump'
const OUTPUT_FILE = process.env.OUTPUT_FILE || 'postman.decrypted.dump'
const PARAMS_FILE = process.env.PARAMS_FILE || 'postman.json'
const PRIVATE_KEY = process.env.PRIVATE_KEY || 'key.pem'

async function decrypt() {
  const params: EncryptionParams = JSON.parse(
    fs.readFileSync(PARAMS_FILE, 'utf8')
  )

  const privateKey = crypto.createPrivateKey(fs.readFileSync(PRIVATE_KEY))
  const decryptionKey = crypto.privateDecrypt(
    privateKey,
    Buffer.from(params.encryptedKey, 'base64')
  )

  const inputFileStream = fs.createReadStream(INPUT_FILE)
  const outputFileStream = fs.createWriteStream(OUTPUT_FILE)
  const iv = Buffer.from(params.iv, 'base64')
  const decipher = crypto.createDecipheriv(params.algorithm, decryptionKey, iv)
  decipher.setAuthTag(Buffer.from(params.authTag, 'base64'))

  await pipeline(inputFileStream, decipher, outputFileStream)
  console.log(`Success: ${INPUT_FILE} decrypted to ${OUTPUT_FILE}`)
}

decrypt().catch((err) => console.error(err))
