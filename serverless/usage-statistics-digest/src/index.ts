import * as Sentry from '@sentry/node'

import config from './config'
import { getCronitor } from './utils/cronitor'
import {
  generateUsageStatisticsDigest,
  init,
  sendDigestToSlackChannel,
} from './usageStatistics'

// If cronitor is null, monitoring is not enabled for this environment
const cronitor = getCronitor()

Sentry.init({
  dsn: config.get('sentryDsn'),
  environment: config.get('env'),
})
Sentry.configureScope((scope) => {
  const functionName =
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    `usage-statistics-digest-${config.get('env')}`
  scope.setTag('lambda-function-name', functionName)
})

export const handler = async (): Promise<{ statusCode: number }> => {
  try {
    await cronitor?.run()
    await init()

    const usageStatisticsDigest = await generateUsageStatisticsDigest()
    await sendDigestToSlackChannel(usageStatisticsDigest)
    await cronitor?.complete()
  } catch (err) {
    Sentry.captureException(err)
    await Sentry.flush(2000)

    if (err instanceof Error) {
      await cronitor?.fail(err.message)
    }

    // Rethrow error so that Lambda will recognize this as a failed invocation
    throw err
  }
  return {
    statusCode: 200,
  }
}
