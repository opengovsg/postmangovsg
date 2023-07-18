import { Config } from 'sst/node/config'

import { getSequelize } from '@/core/database/client'
import { sendEmail } from '@/core/util/email'

import { IS_LOCAL, LOCAL_DB_URI } from '../../env'

import { createEmailBody, getUserRedactedCampaigns } from './helper'

export async function handler(event: { selectedRecipients?: Array<string> }) {
  // this is an optional parameter that allow for manually triggering the function for a specific set of users
  const { selectedRecipients } = event
  const dbUri = IS_LOCAL ? LOCAL_DB_URI : Config.POSTMAN_DB_URI
  const sequelize = getSequelize(dbUri)
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
