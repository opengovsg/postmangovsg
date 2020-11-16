import 'source-map-support/register'

import { init, getUserRedactedCampaigns } from './redaction'
import { createEmailBody } from './utils/generate-digest-mail'
import { mailClient } from './mail-client.class'

/**
 * Lambda handler to send redaction digest
 */
const handler = async (): Promise<{ statusCode: number }> => {
  await init()
  const userRedactedCampaigns = await getUserRedactedCampaigns()

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

      console.log(`Reminder sent to ${email}`)
    } catch (err) {
      console.error(`Failed to send reminder to ${email}`)
    }
  }

  return { statusCode: 200 }
}

export { handler }
