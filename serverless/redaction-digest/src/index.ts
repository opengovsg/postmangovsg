require('module-alias/register')
import 'source-map-support/register'
import * as Sentry from '@sentry/node'

import config from './config'
import { init, getUserRedactedCampaigns } from './redaction'
import { mailClient } from './mail-client.class'
import { getCronitor } from './utils/cronitor'
import { Logger } from './utils/logger'
import { createEmailBody } from './utils/generate-digest-mail'

const logger = new Logger('redaction-digest')
const cronitor = getCronitor()

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

/**
 * Lambda handler to send redaction digest
 */
const handler = async (event: any): Promise<{ statusCode: number }> => {
  try {
    await cronitor?.run()
    await init()

    const { selectedRecipients } = event
    const userRedactedCampaigns = await getUserRedactedCampaigns(
      selectedRecipients
    )

    const failedRecipients = []
    for (const userCampaigns of userRedactedCampaigns) {
      const { email, campaigns } = userCampaigns

      try {
        const emailBody = createEmailBody(campaigns)

        await mailClient.sendMail({
          recipients: [email],
          subject:
            'Postman.gov.sg: Reminder for expiring campaign delivery reports',
          body: emailBody,
        })

        logger.log(`Redaction reminder sent to ${email}`)
      } catch (err) {
        logger.log(
          `Failed to send redaction reminder to ${email}. Error: ${
            (err as Error).message
          }`
        )

        failedRecipients.push(email)
        Sentry.captureException(err)
        await Sentry.flush(2000)
      }
    }

    if (failedRecipients.length > 0) {
      throw new Error(
        `Failed to send redaction reminders to ${failedRecipients.join(', ')}`
      )
    }

    await cronitor?.complete()
    return { statusCode: 200 }
  } catch (err) {
    const errAsError = err as Error
    logger.log(errAsError.message)

    Sentry.captureException(err)
    await Sentry.flush(2000)

    cronitor?.fail(errAsError.message)

    // Rethrow error to signal a lambda failure
    throw err
  }
}

export { handler }
