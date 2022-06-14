import { Sequelize } from 'sequelize-typescript'
import { QueryTypes } from 'sequelize'

import { Logger } from './utils/logger'
import sequelizeLoader from './sequelize-loader'
import { UserUnsubscribeDigest } from './interface'
import MailClient from '@shared/clients/mail-client.class'
import { createEmailBody } from './utils/generate-digest-mail'
import config from './config'

const logger = new Logger('unsubscribe')

export const mailClient = new MailClient(
  config.get('mailOptions'),
  config.get('mailOptions.callbackHashSecret'),
  config.get('mailFrom'),
)

let sequelize: Sequelize | undefined

export const init = async (): Promise<void> => {
  if (!sequelize) {
    sequelize = await sequelizeLoader()
  }
}

/**
 * Gets list of unsubscribing recipients grouped by campaign and user email
 */
export const getUnsubscribeList = async (): Promise<
  Array<UserUnsubscribeDigest>
> => {
  const unsubscribeList = (
    await sequelize?.query(
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
      { useMaster: false }
    )
  )?.[0] as Array<UserUnsubscribeDigest>
  return unsubscribeList
}

/**
 * Generates unsubscribe digest email body for a user
 * Send the unsubscribe digest email to the user
 * Update sent_at in subscribers table for all recipients which were included in this digest
 */
export const sendEmailAndUpdateUnsubscribers = async ({
  email,
  unsubscribe_list: unsubscribeList,
}: UserUnsubscribeDigest): Promise<void> => {
  const emailBody = createEmailBody(unsubscribeList)

  await mailClient.sendMail({
    recipients: [email],
    subject: 'Postman.gov.sg: Weekly Digest for Recipients who Unsubscribed',
    body: emailBody,
  })

  const campaignIds = unsubscribeList.map(({ id }) => id)
  await updateUnsubscribers(campaignIds)
}

/**
 * Updates unsubscribers table to set sent_at as now for all recipients
 * of campaign ids which have sent_at as null
 */
const updateUnsubscribers = async (
  campaignIds: Array<number>
): Promise<void> => {
  await sequelize?.query(
    `UPDATE unsubscribers SET sent_at = now() WHERE sent_at IS NULL AND campaign_id IN(:campaignIds);`,
    {
      replacements: { campaignIds },
      type: QueryTypes.UPDATE,
    }
  )
  logger.log(
    `Updated sent_at for campaigns ${campaignIds} in unsubscribers table`
  )
}
