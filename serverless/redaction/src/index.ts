import 'source-map-support/register'
import * as Sentry from '@sentry/node'

import config from './config'
import {
  init,
  getUserRedactedCampaigns,
  redactExpiredMessages,
} from './redaction'
import { mailClient } from './mail-client.class'
import { getCronitor } from './utils/cronitor'
import { Logger } from './utils/logger'
import { createEmailBody } from './utils/generate-digest-mail'
import { HandlerResult } from './interface'

const cronitor = getCronitor()

Sentry.init({
  dsn: config.get('sentryDsn'),
  environment: config.get('env'),
})

/**
 * Lambda handler to send redaction digest
 */
const sendDigest = async (event: any): Promise<HandlerResult> => {
  const logger = new Logger('redaction-digest')
  Sentry.configureScope((scope) => {
    const functionName =
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      `redaction-digest-${config.get('env')}`
    scope.setTag('lambda-function-name', functionName)
  })

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
          `Failed to send redaction reminder to ${email}. Error: ${err.message}`
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
    logger.log(err)

    Sentry.captureException(err)
    await Sentry.flush(2000)

    cronitor?.fail(err.message)

    // Rethrow error to signal a lambda failure
    throw err
  }
}

const deleteExpired = async (): Promise<HandlerResult> => {
  const logger = new Logger('redaction-messages')
  Sentry.configureScope((scope) => {
    const functionName =
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      `redaction-delete-expired-${config.get('env')}`
    scope.setTag('lambda-function-name', functionName)
  })

  try {
    await cronitor?.run()
    await init()

    const { email, sms, telegram } = await redactExpiredMessages()
    logger.log(`Deleted ${email} email messages`)
    logger.log(`Deleted ${sms} sms messages`)
    logger.log(`Deleted ${telegram} telegram messages`)
  } catch (err) {
    logger.log(err)

    Sentry.captureException(err)
    await Sentry.flush(2000)

    cronitor?.fail(err.message)

    // Rethrow error to signal a lambda failure
    throw err
  }

  return { statusCode: 200 }
}

export { sendDigest, deleteExpired }
