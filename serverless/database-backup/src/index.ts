import 'source-map-support/register'
import process from 'process'
import * as Sentry from '@sentry/node'

import config from './config'
import { PgDump, SecretsManagerDump } from './dumps'
import Encryptor from './encryptor'
import Backup from './backup'
import { Logger } from './utils/logger'
import { getCronitor } from './utils/cronitor'

import { EncryptionConfig, DatabaseConfig } from './interfaces'

const logger = new Logger('db-backup')
// If cronitor is null, monitoring is not enabled for this environment
const cronitor = getCronitor()

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
const main = async () => {
  try {
    await cronitor?.run()

    const dbConfig = config.get('database') as DatabaseConfig
    const encryptionConfig = config.get('encryption') as EncryptionConfig

    const pgDump = new PgDump(dbConfig)
    const secretsDump = new SecretsManagerDump(dbConfig)
    const encryptor = new Encryptor(encryptionConfig)

    const backup = new Backup({
      encryptor,
      pgDump,
      secretsDump,
    })
    const backupLocation = await backup.upload()

    logger.log(`Database backup uploaded to ${backupLocation}`)
    await cronitor?.complete()
    return { statusCode: 200 }
  } catch (err) {
    console.error(err)

    Sentry.captureException(err)
    await Sentry.flush(2000)

    await cronitor?.fail(err.message)

    throw err
  }
}

main()
  .then(() => {
    console.log('Succesfully completed backup')
    process.exit(0)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
