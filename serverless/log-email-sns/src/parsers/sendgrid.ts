// @ts-ignore
import { Ecdsa, Signature, PublicKey } from 'starkbank-ecdsa'
import config from '../config'
import {
  updateDeliveredStatus,
  updateBouncedStatus,
  updateComplaintStatus,
} from '../update-status'
const PUBLIC_KEY = PublicKey.fromPem(config.get('sendgridPublicKey'))

type SendgridEvent = {
  body: Array<SendgridRecord>
}
type SendgridRecord = {
  // the unique_args that we passed
  environment: string
  message_id: string
  // standard args
  email: string
  event: string
  type: string
  'smtp-id': string
  timestamp: number
}

const isSendgridEvent = (event: any): boolean => {
  const signature = event.headers['X-Twilio-Email-Event-Webhook-Signature']
  const timestamp = event.headers['X-Twilio-Email-Event-Webhook-Timestamp']
  if (!(event.body && signature && timestamp)) {
    return false
  }
  const decodedSignature = Signature.fromBase64(signature)
  const timestampPayload = timestamp + event.body
  return Ecdsa.verify(timestampPayload, decodedSignature, PUBLIC_KEY)
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

export { SendgridEvent, SendgridRecord, isSendgridEvent, parseRecord }
