import { Request } from 'express'
import url from 'url'
import crypto, { Encoding } from 'crypto'
import https from 'https'
import { loggerWithLabel } from '@shared/core/logger'
import {
  updateDeliveredStatus,
  updateBouncedStatus,
  updateComplaintStatus,
  updateReadStatus,
} from '@email/utils/callback/update-status'
import { addToBlacklist } from '@email/utils/callback/query'
import config from '@core/config'
import { compareSha256Hash } from '@shared/utils/crypto'
import { EmailTransactionalService } from '@email/services/email-transactional.service'
import { SesEventType } from '@email/interfaces/callback.interface'

const logger = loggerWithLabel(module)
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
  unique_args?: {
    message_id?: string
  }
  auth?: {
    username?: string
    hash?: string
  }
  isTransactional?: boolean
}
/**
 * Parses the message to find the matching email_message id
 * @param message
 */
const getSmtpApiHeader = (message: any): SmtpApiHeader | undefined => {
  const headers: Array<{ name: string; value: string }> = message?.mail?.headers
  const smtpApiHeaderValue = headers.find(
    ({ name }) => name === REFERENCE_ID_HEADER_V2
  )?.value
  if (!smtpApiHeaderValue) return
  const smtpApiHeader = JSON.parse(smtpApiHeaderValue) as SmtpApiHeader
  return smtpApiHeader
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
  verifier.update(basestring(record), encoding as Encoding)
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
  const isHardBounced =
    notificationType === 'Bounce' && bounceType === 'Permanent'
  const isNegativelyComplained =
    notificationType === 'Complaint' &&
    !!complaintType &&
    complaintType !== 'not-spam'
  return isHardBounced || isNegativelyComplained
}

const parseNotificationAndEvent = async (
  type: SesEventType,
  message: any,
  metadata: any
): Promise<void> => {
  const messageId = message?.mail?.commonHeaders?.messageId
  const logMeta = { messageId, action: 'parseNotification' }

  switch (type) {
    case SesEventType.Delivery:
      await updateDeliveredStatus(metadata)
      break
    case SesEventType.Bounce:
      await updateBouncedStatus({
        ...metadata,
        bounceType: message?.bounce?.bounceType,
        bounceSubType: message?.bounce?.bounceSubType,
        to: message?.mail?.commonHeaders?.to,
      })
      break
    case SesEventType.Complaint:
      await updateComplaintStatus({
        ...metadata,
        complaintType: message?.complaint?.complaintFeedbackType,
        complaintSubType: message?.complaint?.complaintSubType,
        to: message?.mail?.commonHeaders?.to,
      })
      break
    case SesEventType.Open:
      await updateReadStatus(metadata)
      break
    default:
      logger.warn({
        message: 'Unable to handle messages with this type',
        type,
        ...logMeta,
      })
      return
  }
}

// Validate SES record hash, returns message ID if valid, otherwise throw errors
const validateRecord = async (
  record: SesRecord,
  smtpHeader: SmtpApiHeader | undefined
) => {
  const username = smtpHeader?.auth?.username
  const hash = smtpHeader?.auth?.hash
  if (
    !username ||
    !hash ||
    !compareSha256Hash(config.get('emailCallback.hashSecret'), username, hash)
  ) {
    logger.info({
      message: 'Incorrect email callback hash',
      username,
      timestamp: record.Timestamp,
      hash,
    })

    // if not passed with the new hash, retry with the old way
    // TODO: remove this after all campaigns sent with the old way have completed
    if (
      !(record.SignatureVersion === '1' && (await validateSignature(record)))
    ) {
      throw new Error('Invalid record')
    }
  }
}
const blacklistIfNeeded = async (message: any): Promise<void> => {
  const notificationType = message?.notificationType
  const bounceType = message?.bounce?.bounceType
  const complaintType = message?.complaint?.complaintFeedbackType

  const recipients = message?.mail?.commonHeaders?.to
  if (
    notificationType &&
    recipients &&
    shouldBlacklist({ notificationType, bounceType, complaintType })
  ) {
    await Promise.all(recipients.map(addToBlacklist))
  }
}
const parseRecord = async (record: SesRecord): Promise<void> => {
  logger.info({
    message: 'Parsing SES callback record',
    record,
  })
  const message = JSON.parse(record.Message)
  const smtpApiHeader = getSmtpApiHeader(message)
  await validateRecord(record, smtpApiHeader)

  // Transactional emails don't have message IDs, so blacklist
  // relevant email addresses before everything else
  await blacklistIfNeeded(message)

  const id = smtpApiHeader?.unique_args?.message_id
  const isTransactional = smtpApiHeader?.isTransactional
  const messageId = message?.mail?.commonHeaders?.messageId
  const logMeta = { messageId, action: 'parseRecord' }
  const type = message?.notificationType || message?.eventType

  if (id && type) {
    const metadata = { id, timestamp: record.Timestamp, messageId: messageId }
    logger.info({
      message: 'Update for notification/event type',
      type,
      ...logMeta,
    })
    if (isTransactional) {
      return EmailTransactionalService.handleStatusCallbacks(type, id, {
        timestamp: new Date(record.Timestamp),
        bounce: message.bounce,
        complaint: message.complaint,
      })
    }
    return parseNotificationAndEvent(type, message, metadata)
  }
}

export { HttpEvent, SesRecord, isEvent, parseRecord, validateSignature }
