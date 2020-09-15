import path from 'path'
import AWS from 'aws-sdk'

import config from './config'
import EncryptedPgdump from './pgdump'
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

/**
 * Upload encrypted pg_dump output to S3
 * @param backup
 */
const uploadBackup = async (backup: EncryptedPgdump): Promise<string> => {
  const { database, iv } = backup
  const bucket = config.get('aws.backupBucket')
  const folder = getBackupFolderName()

  const uploads = []

  const encryptionParams = {
    algorithm: backup.algorithm,
    iv: iv.toString('hex'),
  }
  // TODO: Include encryptedKey if KMS generated key is used

  const encryptionParamsPath = path.join(folder, `${database}.json`)
  const encryptionParamsUpload = S3.upload({
    Bucket: bucket,
    Key: encryptionParamsPath,
    Body: JSON.stringify(encryptionParams),
  }).promise()
  uploads.push(encryptionParamsUpload)

  const body = await backup.run()
  const pgdumpUpload = new Promise((resolve, reject) => {
    const pgdumpPath = path.join(folder, `${database}.dump`)
    const params = {
      Bucket: bucket,
      Key: pgdumpPath,
      Body: body,
    }
    // EncryptedPgdump emits an error event whenever any of the underlying stream has an error
    backup.on('error', (err: Error) => reject(err))

    S3.upload(params, (err: Error) => {
      if (err) reject(err)
      resolve()
    })
  })
  uploads.push(pgdumpUpload)

  return Promise.all(uploads).then(() => `s3://${bucket}/${folder}/`)
}

export { uploadBackup }
