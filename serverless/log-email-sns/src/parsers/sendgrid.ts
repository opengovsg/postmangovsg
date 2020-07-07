// @ts-ignore
import { Ecdsa, Signature, PublicKey } from 'starkbank-ecdsa'
import config from '../config'
import {
  updateDeliveredStatus,
  updateBouncedStatus,
  updateComplaintStatus,
} from '../util/update-status'
import { isAuthenticated } from '../util/auth'
const PUBLIC_KEY = PublicKey.fromPem(config.get('sendgridPublicKey'))
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

const isHttpEvent = (event: any): boolean => {
  if (!event.headers) return false
  if (!isAuthenticated(event.headers['Authorization']))
    throw new Error('Unauthorized')
  const signature = event.headers[SIGNATURE_HEADER]
  const timestamp = event.headers[TIMESTAMP_HEADER]
  if (!(signature && timestamp && event.body)) {
    return false
  }
  const decodedSignature = Signature.fromBase64(signature)
  const timestampPayload = timestamp + event.body
  if (!Ecdsa.verify(timestampPayload, decodedSignature, PUBLIC_KEY)) {
    throw new Error('Invalid record')
  }
  return true
}

const parseRecord = async (record: SendgridRecord) => {
  if (record.message_id === undefined) {
    console.log(`No reference message id found for ${record['smtp-id']}`)
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
      console.error(
        `Can't handle messages with this notification type. notificationType = ${record.event}`
      )
      return
  }
}

export { SendgridEvent, isHttpEvent, parseRecord }
