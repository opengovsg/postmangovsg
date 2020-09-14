import 'source-map-support/register'
import * as Sentry from '@sentry/node'

import config from './config'
import EncryptedPgdump, { DatabaseConfig, EncryptionConfig } from './pgdump'
import { uploadBackup } from './upload'

Sentry.init({
  dsn: config.get('sentryDsn'),
  environment: config.get('env'),
})
Sentry.configureScope((scope) => {
  const functionName =
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    `backup-database-${config.get('env')}`
  scope.setTag('lambda-function-name', functionName)
})

/**
 * Lambda to run pg_dump to S3 for backup
 * @param event
 */
const handler = async (_event: any) => {
  try {
    const dbConfig = config.get('database') as DatabaseConfig
    const encryptionConfig = config.get('encryption') as EncryptionConfig

    const backup = new EncryptedPgdump(dbConfig, encryptionConfig)
    const backupLocation = await uploadBackup(backup)

    console.log(`Database backup uploaded to ${backupLocation}`)
  } catch (err) {
    console.error(err)

    Sentry.captureException(err)
    await Sentry.flush(2000)

    throw err
  }
}

exports.handler = handler
