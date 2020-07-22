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
  validateHash,
  getUnsubscriber,
  createUnsubscriber,
}
