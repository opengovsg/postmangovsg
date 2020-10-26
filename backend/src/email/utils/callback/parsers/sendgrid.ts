import { Request } from 'express'
// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
import { Ecdsa, Signature, PublicKey } from 'starkbank-ecdsa'
import config from '@core/config'
import { loggerWithLabel } from '@core/logger'
import {
  updateDeliveredStatus,
  updateBouncedStatus,
  updateComplaintStatus,
} from '@email/utils/callback/update-status'

const logger = loggerWithLabel(module)
const PUBLIC_KEY = PublicKey.fromPem(
  config.get('emailCallback.sendgridPublicKey')
)
const SIGNATURE_HEADER = 'X-Twilio-Email-Event-Webhook-Signature'
const TIMESTAMP_HEADER = 'X-Twilio-Email-Event-Webhook-Timestamp'

type SendgridEvent = SendgridRecord[]

type SendgridRecord = {
  // the unique_args that we passed
  message_id: string
  // standard args
  email: string
  event: string
  type: string
  'smtp-id': string
  timestamp: number
}
const isEvent = (req: Request): boolean => {
  const signature = req.get(SIGNATURE_HEADER)
  const timestamp = req.get(TIMESTAMP_HEADER)
  if (!(signature && timestamp && req.body)) {
    return false
  }
  const decodedSignature = Signature.fromBase64(signature)
  const timestampPayload = timestamp + req.body
  if (!Ecdsa.verify(timestampPayload, decodedSignature, PUBLIC_KEY)) {
    throw new Error('Invalid record')
  }
  return true
}

const parseRecord = async (record: SendgridRecord): Promise<void> => {
  if (record.message_id === undefined) {
    logger.info({
      message: 'No reference message id found',
      smptpId: record['smtp-id'],
      action: 'parseRecord',
    })
    return
  }
  const metadata = {
    id: record.message_id,
    timestamp: new Date(record.timestamp * 1000).toISOString(),
    messageId: record['smtp-id'],
  }
  switch (record.event) {
    case 'delivered':
      await updateDeliveredStatus(metadata)
      break
    case 'bounce':
      await updateBouncedStatus({
        ...metadata,
        bounceType: 'Permanent',
        to: [record.email],
      })
      break
    case 'blocked': // Soft bounce
      await updateBouncedStatus({
        ...metadata,
        bounceType: 'Temporary',
        to: [record.email],
      })
      break
    case 'spamreport':
      await updateComplaintStatus({
        ...metadata,
        complaintType: record.event,
        to: [record.email],
      })
      break
    default:
      logger.error({
        message: 'Unable handle messages with this notification type',
        notificationType: record.event,
        action: 'parseRecord',
      })
      return
  }
}
export { SendgridEvent, isEvent, parseRecord }
