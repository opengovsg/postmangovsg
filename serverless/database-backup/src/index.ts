import * as Sentry from '@sentry/node'
import config from './config'

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
exports.handler = async (_event: any) => {
  return
}
