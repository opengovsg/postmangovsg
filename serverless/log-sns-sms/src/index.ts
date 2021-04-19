import 'source-map-support/register'
import * as Sentry from '@sentry/node'
import zlib from 'zlib'
import { CloudWatchLogsHandler } from 'aws-lambda'

import config from './config'
import { Logger } from './utils/logger'
import { LogEvent } from './interface'
import { processEvent } from './process-event'

const logger = new Logger('log-sns-sms')

Sentry.init({
  dsn: config.get('sentryDsn'),
  environment: config.get('env'),
})
Sentry.configureScope((scope) => {
  const functionName =
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    `redaction-digest-${config.get('env')}`
  scope.setTag('lambda-function-name', functionName)
})

const decompress = (buf: Buffer): Promise<Record<string, any>> => {
  return new Promise((resolve, reject) => {
    zlib.gunzip(buf, (err, result: Buffer) => {
      if (err) return reject(err)

      const resultStr = result.toString('ascii')
      const json = JSON.parse(resultStr)
      resolve(json)
    })
  })
}

/**
 * Handle CloudWatch log events from SNS SMS
 * @param event
 */
const handler: CloudWatchLogsHandler = async (event): Promise<void> => {
  try {
    const compressed = Buffer.from(event.awslogs.data, 'base64')
    const payload = await decompress(compressed)

    const logEvents: LogEvent[] = payload.logEvents
    await Promise.all(logEvents.map(processEvent))
  } catch (err) {
    logger.log(err)

    Sentry.captureException(err)
    await Sentry.flush(2000)

    // Rethrow error to signal a lambda failure
    throw err
  }
}

export { handler }
