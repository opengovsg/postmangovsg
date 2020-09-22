import path from 'path'
import AWS from 'aws-sdk'

import config from './config'
import Encryptor from './encryptor'
import { PgDump, SecretsManagerDump } from './backups'
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
  pgDump: PgDump
  secrets: SecretsManagerDump
  encryptor: Encryptor

  constructor(
    encryptor: Encryptor,
    pgDump: PgDump,
    secrets: SecretsManagerDump
  ) {
    this.pgDump = pgDump
    this.encryptor = encryptor
    this.secrets = secrets
  }

  async upload(): Promise<string> {
    const { database } = this.pgDump
    const bucket = config.get('aws.backupBucket')
    const folder = getBackupFolderName()

    const dumpParams = []

    const pgDumpBody = await this.pgDump.run()
    const pgDumpFilename = `${database}.dump`
    await new Promise((resolve, reject) => {
      const params = {
        Bucket: bucket,
        Key: path.join(folder, pgDumpFilename),
        Body: this.encryptor.encrypt(pgDumpBody),
      }
      this.pgDump.on('error', (err: Error) => reject(err))
      this.encryptor.on('error', (err: Error) => reject(err))

      S3.upload(params, (err: Error) => {
        if (err) reject(err)
        resolve()
      })
    })
    const pgDumpAuthTag = this.encryptor.authTag
    dumpParams.push({
      filename: pgDumpFilename,
      authTag: pgDumpAuthTag?.toString('base64'),
    })

    const secretsDumpBody = await this.secrets.run()
    const secretsDumpFilename = 'secrets.dump'
    await new Promise((resolve, reject) => {
      const params = {
        Bucket: bucket,
        Key: path.join(folder, secretsDumpFilename),
        Body: this.encryptor.encrypt(secretsDumpBody),
      }
      this.encryptor.on('error', (err: Error) => reject(err))

      S3.upload(params, (err: Error) => {
        if (err) reject(err)
        resolve()
      })
    })
    const secretsDumpAuthTag = this.encryptor.authTag
    dumpParams.push({
      filename: secretsDumpFilename,
      authTag: secretsDumpAuthTag?.toString('base64'),
    })

    // We need to wait for upload to complete before authTag is available when the cipher is finalised.
    const encryptionParams = this.encryptor.getEncryptionParams()
    const encryptionParamsPath = path.join(folder, `${database}.json`)
    await S3.upload({
      Bucket: bucket,
      Key: encryptionParamsPath,
      Body: JSON.stringify({ encryption: encryptionParams, dumps: dumpParams }),
    }).promise()

    return `s3://${bucket}/${folder}/`
  }
}

export default Upload
