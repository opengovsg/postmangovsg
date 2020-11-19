import config from '../config'
import { groupBy } from 'lodash'
import moment from 'moment'

import { RedactedCampaign } from '../interface'

const NOTICE_PERIOD = config.get('noticePeriod')
const RETENTION_PERIOD = config.get('retentionPeriod')

export const createEmailBody = (
  redactedCampaigns: Array<RedactedCampaign>
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
    moment(c.expiry_date).format('DD-MM-YYYY')
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
              (list, c) => list.concat(`<li>${c.name}</li>`),
              ''
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
