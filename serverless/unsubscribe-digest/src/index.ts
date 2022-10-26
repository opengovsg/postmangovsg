require('module-alias/register')
import 'source-map-support/register'
import {
  init,
  getUnsubscribeList,
  sendEmailAndUpdateUnsubscribers,
} from './unsubscribe'
import * as Sentry from '@sentry/node'
import config from './config'
import { getCronitor } from './utils/cronitor'

// If cronitor is null, monitoring is not enabled for this environment
const cronitor = getCronitor()

Sentry.init({
  dsn: config.get('sentryDsn'),
  environment: config.get('env'),
})
Sentry.configureScope((scope) => {
  const functionName =
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    `unsubscribe-digest-${config.get('env')}`
  scope.setTag('lambda-function-name', functionName)
})

const handler = async (): Promise<{ statusCode: number }> => {
  try {
    await cronitor?.run()
    await init()

    // Retreive unsubscribed recipients grouped by campaigns and users
    const unsubscribeDigests = await getUnsubscribeList()

    // generate email digest and send email to each user
    for (const userDigest of unsubscribeDigests) {
      await sendEmailAndUpdateUnsubscribers(userDigest)
    }

    await cronitor?.complete()
  } catch (err) {
    console.error(err)

    Sentry.captureException(err)
    await Sentry.flush(2000)

    await cronitor?.fail((err as Error).message)

    // Rethrow error so that Lambda will recognize this as a failed invocation
    throw err
  }

  return {
    statusCode: 200,
  }
}

export { handler }
