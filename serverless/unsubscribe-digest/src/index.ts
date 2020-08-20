import 'source-map-support/register'
import {
  init,
  getUnsubscribeList,
  sendEmailAndUpdateUnsubscribers,
} from './unsubscribe'
import * as Sentry from '@sentry/node'
import config from './config'

Sentry.init({
  dsn: config.get('sentryDsn'),
  environment: config.get('env'),
})
Sentry.configureScope((scope) => {
  const functionName = process.env.AWS_LAMBDA_FUNCTION_NAME || `unsubscribe-digest-${config.get('env')}`
  scope.setTag('lambda-function-name', functionName)
})


const handler = async (): Promise<{ statusCode: number }> => {
  try {
    await init()

    // Retreive unsubscribed recipients grouped by campaigns and users
    const unsubscribeDigests = await getUnsubscribeList()

    // generate email digest and send email to each user
    for (const userDigest of unsubscribeDigests) {
      await sendEmailAndUpdateUnsubscribers(userDigest)
    }
  } catch (err) {
    console.error(err)
    Sentry.captureException(err)
    // Rethrow error so that Lambda will recognize this as a failed invocation
    throw err
  }

  return {
    statusCode: 200,
  }
}

export { handler }
