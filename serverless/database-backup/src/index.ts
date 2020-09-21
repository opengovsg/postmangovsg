import 'source-map-support/register'
import * as Sentry from '@sentry/node'

import config from './config'
import Pgdump from './pgdump'
import Encryptor from './encryptor'
import { EncryptionConfig, DatabaseConfig } from './interfaces'
import { parseRdsEvents, RDS_EVENTS } from './event'
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
const handler = async (event: any) => {
  try {
    const events = parseRdsEvents(event)
    for (const ev of events) {
      if (ev.eventId === RDS_EVENTS.BACKUP_COMPLETE) {
        const encryptionConfig = config.get('encryption') as EncryptionConfig
        const encryptor = new Encryptor(encryptionConfig)

        const dbConfig = config.get('database') as DatabaseConfig
        const pgdump = new Pgdump(dbConfig)

        const backupLocation = await uploadBackup(pgdump, encryptor)

        console.log(`Database backup uploaded to ${backupLocation}`)
      }
    }
    return { statusCode: 200 }
  } catch (err) {
    console.error(err)

    Sentry.captureException(err)
    await Sentry.flush(2000)

    throw err
  }
}

exports.handler = handler
