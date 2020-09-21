import path from 'path'
import AWS from 'aws-sdk'

import config from './config'
import Encryptor from './encryptor'
import Pgdump from './pgdump'
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
 * @param pgdump
 */
const uploadBackup = async (
  pgdump: Pgdump,
  encryptor: Encryptor
): Promise<string> => {
  const { database } = pgdump
  const bucket = config.get('aws.backupBucket')
  const folder = getBackupFolderName()

  const body = await pgdump.run()
  await new Promise((resolve, reject) => {
    const pgdumpPath = path.join(folder, `${database}.dump`)
    const params = {
      Bucket: bucket,
      Key: pgdumpPath,
      Body: encryptor.encrypt(body),
    }
    // Reject when an error occurs in one of the underlying streams
    pgdump.on('error', (err: Error) => reject(err))
    encryptor.on('error', (err: Error) => reject(err))

    S3.upload(params, (err: Error) => {
      if (err) reject(err)
      resolve()
    })
  })

  // We need to wait for upload to complete before authTag is available when the cipher is finalised.
  const encryptionParams = encryptor.getEncryptionParams()
  const encryptionParamsPath = path.join(folder, `${database}.json`)
  await S3.upload({
    Bucket: bucket,
    Key: encryptionParamsPath,
    Body: JSON.stringify(encryptionParams),
  }).promise()

  return `s3://${bucket}/${folder}/`
}

export { uploadBackup }
