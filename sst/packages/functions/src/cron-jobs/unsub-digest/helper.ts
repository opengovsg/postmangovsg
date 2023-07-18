import { QueryTypes } from 'sequelize'
import { Sequelize } from 'sequelize-typescript'

import { sendEmail } from '@/core/util/email'

export interface CampaignUnsubscribeList {
  id: number
  name: string
  unsubscribers: Array<string>
}

export interface UserUnsubscribeDigest {
  email: string
  unsubscribe_list: Array<CampaignUnsubscribeList>
}

const GUIDE_URL =
  'https://guide.postman.gov.sg/quick-start/email/weekly-digest-of-unsubscription'

/**
 * Gets list of unsubscribing recipients grouped by campaign and user email
 */
export const getUnsubscribeList = async (
  sequelize: Sequelize,
): Promise<Array<UserUnsubscribeDigest>> => {
  const unsubscribeList = (
    await sequelize.query(
      `WITH unsent_unsubscribers AS (
        SELECT users.email, json_build_object('id', campaigns.id, 'name',campaigns.name, 'unsubscribers',
            array_agg(recipient)) AS unsubscribed_campaigns
        FROM
          unsubscribers
          INNER JOIN campaigns ON unsubscribers.campaign_id = campaigns.id
          INNER JOIN users ON campaigns.user_id = users.id
        WHERE sent_at IS NULL
        GROUP BY users.email, campaigns.id
      )
      SELECT email, json_agg(unsubscribed_campaigns) as unsubscribe_list
      FROM unsent_unsubscribers
      GROUP BY email;`,
      { useMaster: false },
    )
  )?.[0] as Array<UserUnsubscribeDigest>
  return unsubscribeList
}

/**
 * Generates unsubscribe digest email body for a user
 * Send the unsubscribe digest email to the user
 * Update sent_at in subscribers table for all recipients which were included in this digest
 */
export const sendUnsubEmail = async ({
  email,
  unsubscribe_list: unsubscribeList,
}: UserUnsubscribeDigest): Promise<void> => {
  const emailBody = createEmailBody(unsubscribeList)

  await sendEmail({
    recipient: email,
    subject: 'Postman.gov.sg: Weekly Digest for Recipients who Unsubscribed',
    body: emailBody,
    tag: 'unsubscribe-digest',
  })
  console.log(`Sent unsubscribe digest email to ${email}`)
}

/**
 * Updates unsubscribers table to set sent_at as now for all recipients
 * of campaign ids which have sent_at as null
 */
export const updateUnsubscribers = async (
  { email: _, unsubscribe_list: unsubscribeList }: UserUnsubscribeDigest,
  sequelize: Sequelize,
): Promise<void> => {
  const campaignIds = unsubscribeList.map(({ id }) => id)
  await sequelize?.query(
    `UPDATE unsubscribers SET sent_at = now() WHERE sent_at IS NULL AND campaign_id IN(:campaignIds);`,
    {
      replacements: { campaignIds },
      type: QueryTypes.UPDATE,
    },
  )
  console.log(
    `Updated sent_at for campaigns ${campaignIds} in unsubscribers table`,
  )
}

const createEmailBody = (campaigns: Array<CampaignUnsubscribeList>): string => {
  const intro = `
    Greetings from the Postman team,<br><br>
    In order to comply with Singapore's Spam Control Act and align with
    international bulk email practices, Postman has implemented an option
    for the recipient to unsubscribe to future emails. Campaign owners will
    receive a weekly list of people who have indicated their wish to unsubscribe
    from your emails. Please exercise your best judgment to determine whether
    or not to remove these recipients from your mailing list based on the content
    of your email. If your email is promotional in nature, please remove these
    recipients from your mailing list to respect their wishes.<br><br>
  `

  let digest = ''
  for (const campaign of campaigns) {
    digest += campaignDigest(campaign)
  }

  const signOff = `
    Please visit our <a href='${GUIDE_URL}' target=_blank>guide</a> if you have
    additional questions on the unsubscribe feature for the recipient.<br><br>
    Thank you,<br>
    Postman.gov.sg
  `

  return `${intro}${digest}${signOff}`
}

/**
 * Generates a template of campaign name and a list of unsubcribers
 */
const campaignDigest = ({
  name,
  unsubscribers,
}: CampaignUnsubscribeList): string => {
  return `
    <b>Campaign name</b>: ${name}<br>
    <b>Unsubscribed recipients</b>:<br>
    ${unsubscribers.join('<br>')}<br><br>
  `
}
