import crypto from 'crypto'
import config from '@core/config'

import { Unsubscriber } from '@core/models'

/**
 * Creates a new HMAC object based on the active unsubscribe version
 * @param version
 */
const createHmac = (version: string): crypto.Hmac => {
  const { algo, key } = config.get(`unsubscribeHmac.${version}`)
  return crypto.createHmac(algo, key)
}

/**
 * Validate hash for a given campaignId, recipient and version
 */
const validateHash = ({
  campaignId,
  recipient,
  version,
  hash,
}: {
  campaignId: number
  recipient: string
  version: string
  hash: string
}): void => {
  const data = `${campaignId}.${recipient}`
  const digest = createHmac(version).update(data).digest('hex')
  const valid = crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hash))

  if (!valid) {
    throw new Error('Invalid hash')
  }
}

/**
 * Create a new unsubscriber
 * @param campaignId
 * @param recipient
 */
const findOrCreateUnsubscriber = ({
  campaignId,
  recipient,
}: {
  campaignId: number
  recipient: string
}): Promise<[Unsubscriber, boolean]> => {
  return Unsubscriber.findOrCreate({
    where: {
      campaignId,
      recipient,
    },
  })
}

const appendTestEmailUnsubLink = (body: string): string => {
  const testUnsubUrl = new URL(`/unsubscribe/test`, config.get('frontendUrl'))
  const colors = {
    text: '#697783',
    link: '#2C2CDC',
  }

  return `${body} <br><hr> 
  <p style="font-size:12px;color:${colors.text};line-height:2em">\
    <a href="https://postman.gov.sg" style="color:${colors.link}" target="_blank">Postman.gov.sg</a>
    is a mass messaging platform used by the Singapore Government to communicate with stakeholders.
    For more information, please visit our <a href="https://guide.postman.gov.sg/faqs/faq-recipients" style="color:${colors.link}" target="_blank">site</a>. 
  </p>
  <p style="font-size:12px;color:${colors.text};line-height:2em">
    If you wish to unsubscribe from similar emails from your sender, please click <a href="${testUnsubUrl}" style="color:${colors.link}" target="_blank">here</a>
    to unsubscribe and we will inform the respective agency.
  </p>
  `
}

export const UnsubscriberService = {
  validateHash,
  findOrCreateUnsubscriber,
  appendTestEmailUnsubLink,
}
