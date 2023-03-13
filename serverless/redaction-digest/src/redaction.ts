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
      start: `${NOTICE_PERIOD} days`,
      end: `${NOTICE_PERIOD * 2} days`,
      retentionPeriod: `${RETENTION_PERIOD} days`,
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
          'expiry_date', max(job_queue.updated_at) + interval :retentionPeriod
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
        AND (max(job_queue.updated_at) + interval :retentionPeriod) BETWEEN
            (cast(current_timestamp as date) + interval :start) AND (cast(current_timestamp as date) + interval :end)
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
