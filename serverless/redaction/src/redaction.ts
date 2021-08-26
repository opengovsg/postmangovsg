import { QueryTypes } from 'sequelize'
import { Sequelize } from 'sequelize-typescript'
import sequelizeLoader from './sequelize-loader'

import config from './config'
import { UserRedactedCampaigns } from './interface'

const NOTICE_PERIOD = config.get('noticePeriod')
const RETENTION_PERIOD = config.get('retentionPeriod')

let sequelize: Sequelize | null

/**
 * Initialize database connection pool
 */
export const init = async (): Promise<void> => {
  if (!sequelize) {
    sequelize = await sequelizeLoader()
  }
}

/**
 * Retrieve redacted campaigns for each user
 */
export const getUserRedactedCampaigns = async (
  selectedRecipients?: Array<string>
): Promise<Array<UserRedactedCampaigns>> => {
  if (selectedRecipients && selectedRecipients.length < 1) {
    throw new Error('If specified, selectedRecipients cannot be empty')
  }

  const options = {
    useMaster: false,
    replacements: {
      start: NOTICE_PERIOD,
      end: NOTICE_PERIOD * 2,
      retentionPeriod: RETENTION_PERIOD,
      ...(selectedRecipients ? { selectedRecipients } : {}),
    },
  }

  const redactedCampaigns = (
    await sequelize?.query(
      `WITH redacted_campaigns AS (
      SELECT
        users.email,
        json_build_object(
          'id', campaigns.id,
          'name', campaigns.name,
          'expiry_date', max(job_queue.updated_at) + interval ':retentionPeriod days'
        ) AS campaign_json
      FROM
        campaigns
        INNER JOIN job_queue ON job_queue.campaign_id = campaigns.id
        INNER JOIN statistics ON statistics.campaign_id = campaigns.id
        INNER JOIN users ON users.id = campaigns.user_id
      GROUP BY
        users.email,
        campaigns.id
      HAVING
        sum(unsent) = 0
        AND every(job_queue.status = 'LOGGED')
        AND (max(job_queue.updated_at) + interval ':retentionPeriod days') BETWEEN
            (cast(current_timestamp as date) + interval ':start days') AND (cast(current_timestamp as date) + interval ':end days')
      ORDER BY
        max(job_queue.updated_at)
    )
    SELECT
      email,
      json_agg(campaign_json) AS campaigns
    FROM
      redacted_campaigns
    ${selectedRecipients ? 'WHERE email IN (:selectedRecipients)' : ''}
    GROUP BY
      email;`,
      options
    )
  )?.[0] as Array<UserRedactedCampaigns>

  return redactedCampaigns
}

/**
 * Delete expired messages from email, sms and telegram messages
 */
export const redactExpiredMessages = async (): Promise<{
  email: number
  sms: number
  telegram: number
}> => {
  // Wrapping up deletes in a single transaction
  const deleted = await sequelize?.transaction(async (transaction) => {
    const options = {
      transaction,
      replacements: {
        retentionPeriod: RETENTION_PERIOD,
        type: QueryTypes.DELETE,
      },
    }

    // Subquery for selecting IDs of campaigns that are older than the retention period.
    const expiredCampaigns = `
      SELECT
        campaigns.id
      FROM
        campaigns,
        job_queue,
        "statistics"
      WHERE
        campaigns.id = "statistics".campaign_id
        AND job_queue.campaign_id = campaigns.id
      GROUP BY
        campaigns.id
      HAVING
        sum(unsent) = 0
        AND every(job_queue.status = 'LOGGED')
        AND MAX(job_queue.updated_at) <= cast(CURRENT_TIMESTAMP as date) - INTERVAL ':retentionPeriod days'
    `

    const { rowCount: email } = (
      await sequelize?.query(
        `DELETE FROM email_messages WHERE campaign_id IN (${expiredCampaigns})`,
        options
      )
    )?.[1] as { rowCount: number }

    const { rowCount: sms } = (
      await sequelize?.query(
        `DELETE FROM sms_messages WHERE campaign_id IN (${expiredCampaigns})`,
        options
      )
    )?.[1] as { rowCount: number }

    const { rowCount: telegram } = (
      await sequelize?.query(
        `DELETE FROM telegram_messages WHERE campaign_id IN (${expiredCampaigns})`,
        options
      )
    )?.[1] as { rowCount: number }

    return { email, sms, telegram }
  })

  if (!deleted) throw new Error('Unable to delete messages')
  return deleted
}
