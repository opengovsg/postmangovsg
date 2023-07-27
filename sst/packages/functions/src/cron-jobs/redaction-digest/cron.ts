import { Config } from 'sst/node/config'

import { getSequelize } from '@/core/database/client'
import { sendEmail } from '@/core/util/email'

import { createEmailBody, getUserRedactedCampaigns } from './helper'

interface Event {
  selectedRecipients?: Array<string>
}
export async function handler(event: Event) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cronitor = require('cronitor')(Config.CRONITOR_URL_SUFFIX) // common to all jobs on our shared Cronitor account
    const invokeFunction =
      process.env.IS_LOCAL === 'true'
        ? async function () {
            console.log('Running cron locally')
            await sendRedactionDigest(event)
          }
        : cronitor.wrap(
            Config.CRONITOR_CODE_REDACTION_DIGEST,
            async function () {
              await sendRedactionDigest(event)
            },
          )
    await invokeFunction()
  } catch (error) {
    console.log(error)
    throw error
  }
}

export async function sendRedactionDigest(event: Event) {
  // this is an optional parameter that allow for manually triggering the function for a specific set of users
  const { selectedRecipients } = event
  const sequelize = getSequelize(Config.POSTMAN_DB_URI)
  const userRedactedCampaigns = await getUserRedactedCampaigns(
    sequelize,
    selectedRecipients,
  )
  const failedRecipients = []
  for (const userCampaigns of userRedactedCampaigns) {
    const { email, campaigns } = userCampaigns

    try {
      const emailBody = createEmailBody(campaigns)
      await sendEmail({
        recipient: email,
        subject:
          'Postman.gov.sg: Reminder for expiring campaign delivery reports',
        body: emailBody,
        tag: 'redaction-digest',
      })

      console.log(`Redaction reminder sent to ${email}`)
    } catch (err) {
      console.log(
        `Failed to send redaction reminder to ${email}. Error: ${
          (err as Error).message
        }`,
      )
      failedRecipients.push(email)
    }
  }

  if (failedRecipients.length > 0) {
    throw new Error(
      `Failed to send redaction reminders to ${failedRecipients.join(', ')}`,
    )
  }
}
