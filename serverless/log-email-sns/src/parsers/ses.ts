import url from 'url'
import crypto, { Utf8AsciiLatin1Encoding } from 'crypto'
import https from 'https'
import {
  updateDeliveredStatus,
  updateBouncedStatus,
  updateComplaintStatus,
} from '../util/update-status'
import { isAuthenticated } from '../util/auth'
import config from '../config'
const REFERENCE_ID_HEADER_V1 = 'X-SMTPAPI' // Case sensitive
const certCache: { [key: string]: string } = {}

type SesRecord = {
  Message: string
  MessageId: string
  Timestamp: string
  TopicArn: string
  Type: string
  Signature: string
  SignatureVersion: string
  SigningCertUrl?: string // Sns Record
  SigningCertURL?: string // Http Record
}

type SnsEvent = {
  Records: Array<{ Sns: SesRecord }>
}

type HttpEvent = SesRecord[]

type SmtpApiHeader = {
  unique_args: {
    message_id: string
    environment?: string // TODO: make this mandatory when the messages are being sent with this property consistently
  }
}

/**
 * Extracts the smtp header from message
 * @param message
 */
const getSmtpApiHeader = (message: any): SmtpApiHeader | undefined => {
  const headers: Array<{ name: string; value: string }> = message?.mail?.headers
  const smtpApiHeaderValue = headers.find(
    ({ name }) => name === REFERENCE_ID_HEADER_V1
  )?.value
  if (smtpApiHeaderValue !== undefined) {
    const smtpApiHeader = JSON.parse(smtpApiHeaderValue) as SmtpApiHeader
    return smtpApiHeader
  }
  return
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

const isSnsEvent = (event: any): boolean => {
  return (
    event.Records instanceof Array &&
    event.Records.length > 0 &&
    event.Records[0].Sns !== undefined
  )
}

const isHttpEvent = (event: any): boolean => {
  if (!event.headers) return false
  if (!isAuthenticated(event.headers['Authorization']))
    throw new Error('Unauthorized')
  return (
    event.headers['x-amz-sns-message-type'] !== undefined &&
    event.body !== undefined
  )
}

const parseRecord = async (record: SesRecord) => {
  if (!(record.SignatureVersion === '1' && (await validateSignature(record)))) {
    throw new Error(`Invalid record`)
  }

  const message = JSON.parse(record.Message)
  const messageId = message?.mail?.commonHeaders?.messageId
  const smtpApiHeader = getSmtpApiHeader(message)
  if (!smtpApiHeader) {
    console.log(`No smtp api header found for ${messageId}`)
    return
  }
  const environment = smtpApiHeader.unique_args.environment
  if (environment && environment !== config.get('env')) {
    console.log(
      `Mismatched environment for ${messageId}. Lambda: ${config.get(
        'env'
      )}. Message: ${environment}. `
    )
    return
  }

  const notificationType = message?.notificationType
  console.log(`Update for notificationType = ${notificationType}`)
  const metadata = {
    id: smtpApiHeader.unique_args.message_id,
    timestamp: record.Timestamp,
    messageId: messageId,
  }
  switch (notificationType) {
    case 'Delivery':
      await updateDeliveredStatus(metadata)
      break
    case 'Bounce':
      await updateBouncedStatus({
        ...metadata,
        bounceType: message?.bounce?.bounceType,
        to: message?.mail?.commonHeaders?.to,
      })
      break
    case 'Complaint':
      await updateComplaintStatus({
        ...metadata,
        complaintType: message?.complaint?.complaintFeedbackType,
        to: message?.mail?.commonHeaders?.to,
      })
      break
    default:
      console.error(
        `Can't handle messages with this notification type. notificationType = ${notificationType}`
      )
      return
  }
}
export { SnsEvent, HttpEvent, SesRecord, isSnsEvent, isHttpEvent, parseRecord }
