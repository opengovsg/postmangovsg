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
 * Validate that the HMAC is valid for a given campaignId and recipient
 * @param campaignId
 * @param recipient
 * @param messageHmac
 */
const validateHmac = (
  campaignId: string,
  recipient: string,
  messageHmac: string
): void => {
  const data = `${campaignId}.${recipient}`

  const hmac = createHmac(config.get('unsubscribeHmac.version'))
  hmac.update(data)
  const digest = hmac.digest('hex')

  const valid = crypto.timingSafeEqual(
    Buffer.from(digest),
    Buffer.from(messageHmac)
  )

  if (!valid) {
    throw new Error('Invalid hmac')
  }
}

/**
 * Retrieves unsubscriber
 * @param campaignId
 * @param recipient
 */
const getUnsubscriber = (
  campaignId: number,
  recipient: string
): Promise<Unsubscriber> => {
  return Unsubscriber.findOne({
    where: { campaignId, recipient },
  })
}

/**
 * Create a new unsubscriber
 * @param campaignId
 * @param recipient
 */
const createUnsubscriber = ({
  campaignId,
  recipient,
}: {
  campaignId: number
  recipient: string
}): Promise<Unsubscriber> => {
  return Unsubscriber.create({ campaignId, recipient })
}

export const UnsubscriberService = {
  validateHmac,
  getUnsubscriber,
  createUnsubscriber,
}
