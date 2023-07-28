import { groupBy } from 'lodash'
import moment from 'moment'
import { Sequelize } from 'sequelize-typescript'

export interface RedactedCampaign {
  id: number
  name: string
  expiry_date: Date
}

export interface UserRedactedCampaigns {
  email: string
  campaigns: Array<RedactedCampaign>
}

export const RETENTION_PERIOD = 30
export const NOTICE_PERIOD = 7
// TODO switch based on stage
const FRONTEND_URL =
  'https://postman.gov.sg' ||
  'https://staging.postman.gov.sg' ||
  'http://localhost:3000'

export const getUserRedactedCampaigns = async (
  sequelize: Sequelize,
  selectedRecipients?: Array<string>,
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
      options,
    )
  )?.[0] as Array<UserRedactedCampaigns>
  return redactedCampaigns
}

export const createEmailBody = (
  redactedCampaigns: Array<RedactedCampaign>,
): string => {
  const intro = `
    Greetings,<br>

    <p>
      This is a gentle reminder that our post-campaign report will only be available for download for
      <b>${RETENTION_PERIOD} consecutive days</b> after you have sent out a campaign. This is an added
      security measure to prevent access to the entire contact list used in the campaign.
    </p>

    <p>
      <b>List of delivery reports expiring in the next ${NOTICE_PERIOD} days</b>
    </p>
  `

  const dailyCampaigns = groupBy(redactedCampaigns, (c) =>
    moment(c.expiry_date).format('DD-MM-YYYY'),
  )
  const digest = Object.keys(dailyCampaigns)
    .sort()
    .reduce((body: string, date: string) => {
      const campaigns = dailyCampaigns[date]
      body += `
        <ul>
          <li><b>Expiring on ${date}</b></li>
          <ul>
            ${campaigns.reduce(
              (list, c) =>
                list.concat(
                  `<li>
                    <a href="${FRONTEND_URL}/campaigns/${c.id}">${c.name}</a> (ID: ${c.id})
                  </li>`,
                ),
              '',
            )}
          </ul>
        </ul>
      `

      return body
    }, '')

  const footer = `
    <p>
      <b>Best Practices</b><br>
      <ol>
        <li>
          Check your campaign statistics 1 day after you have sent out your campaign as some campaign errors
          and status updates take time to finalise.
        </li>
        <li>
          Download a copy of the post-campaign report and store it locally if you need it as a sent receipt
          for specific recipients.
        </li>
      </ol>
    </p>

    <p>
      Please log in to <a href="https://postman.gov.sg">postman.gov.sg</a> and navigate to your campaign
      landing page to download your report if you wish to keep it for audit purpose.
    </p>

    <p>
      Thank you,<br>
      <a href="https://postman.gov.sg">Postman.gov.sg</a> &bull; Open Government Products &bull; <a href="https://open.gov.sg">open.gov.sg</a>
    </p>
  `

  return `${intro}${digest}${footer}`
}
