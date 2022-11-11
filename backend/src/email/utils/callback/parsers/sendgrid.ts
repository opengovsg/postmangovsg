import { Request } from 'express'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { Ecdsa, Signature, PublicKey } from 'starkbank-ecdsa'
import config from '@core/config'
import { loggerWithLabel } from '@shared/core/logger'
import {
  updateDeliveredStatus,
  updateBouncedStatus,
  updateComplaintStatus,
} from '@email/utils/callback/update-status'
import { addToBlacklist } from '@email/utils/callback/query'

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
  reason: string
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

const shouldBlacklist = (event?: string): boolean => {
  return event === 'bounce' || event === 'spamreport'
}

const parseRecord = async (record: SendgridRecord): Promise<void> => {
  const { event, email } = record

  // Transactional emails don't have message IDs, so blacklist
  // relevant addresses before everything else
  if (email && shouldBlacklist(event)) {
    await addToBlacklist(email)
  }

  if (record.message_id === undefined) {
    logger.info({
      message: 'No reference message id found',
      smtpId: record['smtp-id'],
      action: 'parseRecord',
    })
    return
  }
  const metadata = {
    id: record.message_id,
    timestamp: new Date(record.timestamp * 1000).toISOString(),
    messageId: record['smtp-id'],
  }
  switch (event) {
    case 'delivered':
      await updateDeliveredStatus(metadata)
      break
    case 'bounce':
      await updateBouncedStatus({
        ...metadata,
        bounceType: 'Permanent',
        bounceSubType: record.reason,
        to: [record.email],
      })
      break
    case 'blocked': // Soft bounce
      await updateBouncedStatus({
        ...metadata,
        bounceType: 'Temporary',
        bounceSubType: record.reason,
        to: [record.email],
      })
      break
    case 'spamreport':
      await updateComplaintStatus({
        ...metadata,
        complaintType: event,
      })
      break
    default:
      logger.error({
        message: 'Unable handle messages with this notification type',
        notificationType: event,
        action: 'parseRecord',
      })
      return
  }
}
export { SendgridEvent, isEvent, parseRecord }
