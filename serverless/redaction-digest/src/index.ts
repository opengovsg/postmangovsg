import 'source-map-support/register'
import * as Sentry from '@sentry/node'

import config from './config'
import { init, getUserRedactedCampaigns } from './redaction'
import { mailClient } from './mail-client.class'
import { Logger } from './utils/logger'
import { createEmailBody } from './utils/generate-digest-mail'

const logger = new Logger('redaction-digest')

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
const handler = async (): Promise<{ statusCode: number }> => {
  await init()

  const userRedactedCampaigns = await getUserRedactedCampaigns()

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
    logger.log(
      `Failed to send redaction reminder emails to ${failedRecipients.join(
        ', '
      )}`
    )
  }

  return { statusCode: 200 }
}

export { handler }
