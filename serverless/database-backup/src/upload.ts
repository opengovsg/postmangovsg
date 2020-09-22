import path from 'path'
import AWS from 'aws-sdk'

import config from './config'
import Encryptor from './encryptor'
import { Pgdump, SecretsManagerDump } from './backups'
import { configureEndpoint } from './utils/aws-endpoint'

const S3 = new AWS.S3({
  ...configureEndpoint(config),
  computeChecksums: true,
})

const getBackupFolderName = (): string => {
  const today = new Date()
  const yyyy = today.getFullYear()
  const dd = today.getDate().toString().padStart(2, '0')
  const mm = (today.getMonth() + 1).toString().padStart(2, '0')

  return `${yyyy}-${mm}-${dd}`
}

class Upload {
  pgdump: Pgdump
  secrets: SecretsManagerDump
  encryptor: Encryptor

  constructor(
    encryptor: Encryptor,
    pgdump: Pgdump,
    secrets: SecretsManagerDump
  ) {
    this.pgdump = pgdump
    this.encryptor = encryptor
    this.secrets = secrets
  }

  async upload(): Promise<string> {
    const { database } = this.pgdump
    const bucket = config.get('aws.backupBucket')
    const folder = getBackupFolderName()

    const pgdumpBody = await this.pgdump.run()
    await new Promise((resolve, reject) => {
      const pgdumpPath = path.join(folder, `${database}.dump`)
      const params = {
        Bucket: bucket,
        Key: pgdumpPath,
        Body: this.encryptor.encrypt(pgdumpBody),
      }
      this.pgdump.on('error', (err: Error) => reject(err))
      this.encryptor.on('error', (err: Error) => reject(err))

      S3.upload(params, (err: Error) => {
        if (err) reject(err)
        resolve()
      })
    })

    const secretsDumpBody = await this.secrets.run()
    await new Promise((resolve, reject) => {
      const secretsDumpPath = path.join(folder, 'secrets.dump')
      const params = {
        Bucket: bucket,
        Key: secretsDumpPath,
        Body: this.encryptor.encrypt(secretsDumpBody),
      }
      this.encryptor.on('error', (err: Error) => reject(err))

      S3.upload(params, (err: Error) => {
        if (err) reject(err)
        resolve()
      })
    })

    // We need to wait for upload to complete before authTag is available when the cipher is finalised.
    const encryptionParams = this.encryptor.getEncryptionParams()
    const encryptionParamsPath = path.join(folder, `${database}.json`)
    await S3.upload({
      Bucket: bucket,
      Key: encryptionParamsPath,
      Body: JSON.stringify(encryptionParams),
    }).promise()

    return `s3://${bucket}/${folder}/`
  }
}

export default Upload
