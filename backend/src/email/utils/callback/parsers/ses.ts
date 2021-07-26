import { Request } from 'express'
import url from 'url'
import crypto, { Utf8AsciiLatin1Encoding } from 'crypto'
import https from 'https'
import { loggerWithLabel } from '@core/logger'
import {
  updateDeliveredStatus,
  updateBouncedStatus,
  updateComplaintStatus,
  updateReadStatus,
} from '@email/utils/callback/update-status'
import { addToBlacklist } from '@email/utils/callback/query'

const logger = loggerWithLabel(module)
const REFERENCE_ID_HEADER_V1 = 'X-Postman-ID' // Case sensitive
const REFERENCE_ID_HEADER_V2 = 'X-SMTPAPI' // Case sensitive
const certCache: { [key: string]: string } = {}
type SesRecord = {
  Message: string
  MessageId: string
  Subject?: string
  Timestamp: string
  TopicArn: string
  Type: string
  Signature: string
  SignatureVersion: string
  SigningCertUrl?: string // Sns Record
  SigningCertURL?: string // Http Record
}
type HttpEvent = SesRecord[]

type SmtpApiHeader = {
  unique_args: {
    message_id: string
  }
}
/**
 * Parses the message to find the matching email_message id
 * @param message
 */
const getReferenceID = (message: any): string | undefined => {
  const headers: Array<{ name: string; value: string }> = message?.mail?.headers
  const smtpApiHeaderValue = headers.find(
    ({ name }) => name === REFERENCE_ID_HEADER_V2
  )?.value
  if (smtpApiHeaderValue !== undefined) {
    const smtpApiHeader = JSON.parse(smtpApiHeaderValue) as SmtpApiHeader
    return smtpApiHeader.unique_args.message_id
  } else {
    // TODO: Remove 'X-Postman-ID' once the implementation for X-SMTPAPI is stable
    return headers.find(({ name }) => name === REFERENCE_ID_HEADER_V1)?.value
  }
}

const isValidCertUrl = (urlToValidate: string): boolean => {
  const parsed = url.parse(urlToValidate)
  return (
    parsed.protocol === 'https:' &&
    parsed.path?.substr(-4) === '.pem' &&
    parsed.host !== null &&
    /^sns\.[a-zA-Z0-9-]{3,}\.amazonaws\.com(\.cn)?$/.test(parsed.host)
  )
}

const getCertificate = (certUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (certCache[certUrl]) {
      resolve(certCache[certUrl])
    }
    https.get(certUrl, (response) => {
      if (response?.statusCode !== 200) {
        reject(new Error(`Cannot get cert ${response.statusCode}`))
      }
      let data = ''
      response.on('data', (chunk) => (data += chunk))
      response.on('end', () => resolve(data))
    })
  })
}

const basestring = (record: SesRecord): string => {
  return (
    `Message\n${record.Message}\n` +
    `MessageId\n${record.MessageId}\n` +
    `${record.Subject ? `Subject\n${record.Subject}\n` : ``}` +
    `Timestamp\n${record.Timestamp}\n` +
    `TopicArn\n${record.TopicArn}\n` +
    `Type\n${record.Type}\n`
  )
}

const validateSignature = async (
  record: SesRecord,
  encoding = 'utf8'
): Promise<boolean> => {
  const certUrl = record.SigningCertUrl || record.SigningCertURL
  if (!certUrl || !isValidCertUrl(certUrl))
    throw new Error('Invald certificate url')

  const certificate = await getCertificate(certUrl)
  const verifier = crypto.createVerify('RSA-SHA1')
  verifier.update(basestring(record), encoding as Utf8AsciiLatin1Encoding)
  return verifier.verify(certificate, record.Signature, 'base64')
}

const isEvent = (req: Request): boolean => {
  return (
    req.get('x-amz-sns-message-type') !== undefined && req.body !== undefined
  )
}

const shouldBlacklist = ({
  notificationType,
  bounceType,
  complaintType,
}: {
  notificationType?: string
  bounceType?: string
  complaintType?: string
}): boolean => {
  return (
    (notificationType === 'Bounce' && bounceType === 'Permanent') ||
    (notificationType === 'Complaint' && !!complaintType)
  )
}

const parseNotification = async (
  notificationType: string,
  message: any,
  metadata: any
): Promise<void> => {
  const messageId = message?.mail?.commonHeaders?.messageId
  const logMeta = { messageId, action: 'parseNotification' }

  switch (notificationType) {
    case 'Delivery':
      await updateDeliveredStatus(metadata)
      break
    case 'Bounce':
      await updateBouncedStatus({
        ...metadata,
        bounceType: message?.bounce?.bounceType,
        bounceSubType: message?.bounce?.bounceSubType,
        to: message?.mail?.commonHeaders?.to,
      })
      break
    case 'Complaint':
      await updateComplaintStatus({
        ...metadata,
        complaintType: message?.complaint?.complaintFeedbackType,
        complaintSubType: message?.complaint?.complaintSubType,
        to: message?.mail?.commonHeaders?.to,
      })
      break
    default:
      logger.error({
        message: 'Unable to handle messages with this notification type',
        notificationType,
        ...logMeta,
      })
      return
  }
}

const parseEvent = async (
  eventType: string,
  message: any,
  metadata: any
): Promise<void> => {
  const messageId = message?.mail?.commonHeaders?.messageId
  const logMeta = { messageId, action: 'parseEvent' }

  if (eventType === 'Open') {
    await updateReadStatus(metadata)
  } else {
    logger.error({
      message: 'Unable to handle messages with this event type',
      eventType,
      ...logMeta,
    })
    return
  }
}

const parseRecord = async (record: SesRecord): Promise<void> => {
  if (!(record.SignatureVersion === '1' && (await validateSignature(record)))) {
    throw new Error(`Invalid record`)
  }
  const message = JSON.parse(record.Message)
  const messageId = message?.mail?.commonHeaders?.messageId
  const logMeta = { messageId, action: 'parseRecord' }

  if (message?.notificationType) {
    const notificationType = message?.notificationType
    const bounceType = message?.bounce?.bounceType
    const complaintType = message?.complaint?.complaintFeedbackType
    const recipients = message?.mail?.commonHeaders?.to

    // Transactional emails don't have message IDs, so blacklist
    // relevant email addresses before everything else
    if (
      recipients &&
      shouldBlacklist({ notificationType, bounceType, complaintType })
    ) {
      await Promise.all(recipients.map(addToBlacklist))
    }

    const id = getReferenceID(message)
    if (id === undefined) {
      logger.info({ message: 'No reference message id found', ...logMeta })
      return
    }

    const metadata = { id, timestamp: record.Timestamp, messageId: messageId }

    logger.info({
      message: 'Update for notificationType',
      notificationType,
      ...logMeta,
    })
    return parseNotification(notificationType, message, metadata)
  }

  if (message?.eventType) {
    const eventType = message?.eventType

    const id = getReferenceID(message)
    if (id === undefined) {
      logger.info({ message: 'No reference message id found', ...logMeta })
      return
    }

    const metadata = { id, timestamp: record.Timestamp, messageId: messageId }
    logger.info({
      message: 'Update for eventType',
      eventType,
      ...logMeta,
    })
    return parseEvent(eventType, message, metadata)
  }
}

export { HttpEvent, SesRecord, isEvent, parseRecord, validateSignature }
