import twilio from 'twilio'
import { loggerWithLabel } from '@core/logger'
import config from '@core/config'
import { TwilioCredentials } from '@sms/interfaces'
import { getSha256Hash } from '@shared/utils/crypto'

const logger = loggerWithLabel(module)

export default class TwilioClient {
  private client: any
  private messagingServiceSid: string
  private hasCallback: boolean

  constructor(credential: TwilioCredentials) {
    const { accountSid, apiKey, apiSecret, messagingServiceSid } = credential
    this.client = twilio(apiKey, apiSecret, { accountSid })
    this.messagingServiceSid = messagingServiceSid
    this.hasCallback =
      config.get('callbackSecret') !== '' && config.get('backendUrl') !== ''
    if (!this.hasCallback) {
      logger.error({
        message:
          'Missing callback parameters. No status callback will be provided',
      })
    }
  }

  public send(
    messageId: number,
    recipient: string,
    message: string,
    campaignId?: number,
    forceDelivery = false
  ): Promise<string | void> {
    return this.generateStatusCallbackUrl(messageId, campaignId)
      .then((callbackUrl) => {
        return this.client.messages.create({
          to: recipient,
          body: this.replaceNewLines(message),
          from: this.messagingServiceSid,
          forceDelivery: forceDelivery,
          ...(callbackUrl ? { statusCallback: callbackUrl } : {}),
        })
      })
      .then((result: { [key: string]: string }) => {
        const { status, sid, error_code: errorCode, code } = result
        if (sid) {
          if (errorCode || code) {
            return Promise.reject(new Error(`${sid};${errorCode};${code}`))
          } else {
            return sid
          }
        } else {
          return Promise.reject(new Error(`${status};Unknown error`))
        }
      })
      .catch((error) => {
        // Handle +65802 errors by forcing delivery once
        if (
          /\+65802\d+ is not a valid phone number/.test(error.message) &&
          !forceDelivery
        ) {
          return this.send(messageId, recipient, message, campaignId, true)
        }
        return Promise.reject(new Error(error.message))
      })
  }

  private async generateStatusCallbackUrl(
    messageId: number,
    campaignId?: number
  ): Promise<string | undefined> {
    if (!this.hasCallback) return undefined

    const username = Math.random().toString(36).substring(2, 15) // random string
    const password: string =
      username + messageId + campaignId + config.get('callbackSecret')
    const hashedPwd = getSha256Hash(password)

    const callbackUrl = new URL(config.get('backendUrl'))
    callbackUrl.username = username
    // encode password as the hash contains special characters
    callbackUrl.password = encodeURIComponent(hashedPwd)
    callbackUrl.pathname = `${callbackUrl.pathname}/${campaignId}/${messageId}`
    logger.info({
      message: 'Generate status callback url',
      messageId,
      callbackUrl,
    })
    return callbackUrl.toString()
  }

  private replaceNewLines(body: string): string {
    return (body || '').replace(/<br\s*\/?>/g, '\n')
  }
}
