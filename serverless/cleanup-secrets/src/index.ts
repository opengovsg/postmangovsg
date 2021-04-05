import 'source-map-support/register'
import * as Sentry from '@sentry/node'

import config from './config'
import { getSequelize } from './sequelize-loader'
import { CleanupSecretsEvent, CleanupSecretsResponse } from './interfaces'
import { removeCredentials, getDbCredentialsWithoutUsers } from './cleanup'
import { Logger } from './utils/logger'

const logger = new Logger('cleanup')

Sentry.init({
  dsn: config.get('sentryDsn'),
  environment: config.get('env'),
})
Sentry.configureScope((scope) => {
  const functionName =
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    `cleanup-secrets-${config.get('env')}`
  scope.setTag('lambda-function-name', functionName)
})

const handler = async (
  event: CleanupSecretsEvent
): Promise<CleanupSecretsResponse> => {
  try {
    // confirmRemoval has to be explicitly set to true to trigger removal of credentials
    const dryRun = event.confirmRemoval !== true

    if (!dryRun) {
      const wait = config.get('removalWait')
      logger.log(
        `Dry run is set to ${dryRun}. Credentials WILL be removed after ${wait} seconds.`
      )
      await new Promise((resolve) => setTimeout(resolve, wait * 1000))
    } else {
      logger.log(
        `Dry run is set to ${dryRun}. Credentials WILL NOT be removed.`
      )
    }

    const sequelize = await getSequelize()
    // Wrap the deletion in a database transaction to ensure a consistent view of the data
    // during the deletion process.
    await sequelize.transaction(async (t) => {
      const credentials = await getDbCredentialsWithoutUsers(t)
      await removeCredentials(credentials, dryRun, t)
    })

    logger.log('Clean up completed')

    return {
      statusCode: 200,
    }
  } catch (err) {
    logger.error(err)

    Sentry.captureException(err)
    await Sentry.flush(2000)

    // Rethrow error to signal a lambda failure
    throw err
  }
}

export { handler }
