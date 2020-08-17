import twilio, { Twilio } from 'twilio'
import RequestClient from 'twilio/lib/base/RequestClient'
import Response from 'twilio/lib/http/response'
import bcrypt from 'bcrypt'
import { URL } from 'url'
import logger from '@core/logger'
import config from '@core/config'
import { TwilioCredentials } from '@sms/interfaces'

const TWILIO_API_ROOT = config.get('smsOptions.apiRoot')

class CustomRequestClient extends RequestClient {
  apiUrl: URL

  constructor(apiUrl: string) {
    super()
    this.apiUrl = new URL(apiUrl)
    logger.info(`Using custom Twilio API located at ${apiUrl}`)
  }

  patchUrl(opts: RequestClient.RequestOptions): void {
    const uri = new URL(opts.uri)
    uri.host = this.apiUrl.host
    uri.port = this.apiUrl.port
    uri.protocol = this.apiUrl.protocol

    opts.uri = uri.toString()
  }

  request(opts: RequestClient.RequestOptions): Promise<Response<any>> {
    this.patchUrl(opts)
    return super.request(opts)
  }
}

const SALT_ROUNDS = 10
export default class TwilioClient {
  private client: any
  private messagingServiceSid: string
  private hasCallback: boolean

  constructor(credential: TwilioCredentials) {
    const { accountSid, apiKey, apiSecret, messagingServiceSid } = credential
    const opts: Twilio.TwilioClientOptions = { accountSid }
    if (TWILIO_API_ROOT !== config.default('smsOptions.apiRoot')) {
      opts.httpClient = new CustomRequestClient(TWILIO_API_ROOT)
    }

    this.client = twilio(apiKey, apiSecret, opts)
    this.messagingServiceSid = messagingServiceSid
    this.hasCallback =
      config.get('callbackSecret') !== '' && config.get('backendUrl') !== ''
    if (!this.hasCallback) {
      logger.info(
        'Missing callback parameters. No status callback will be provided'
      )
    }
  }

  public send(
    messageId: number,
    recipient: string,
    message: string,
    campaignId?: number
  ): Promise<string | void> {
    return this.generateStatusCallbackUrl(messageId, campaignId)
      .then((callbackUrl) => {
        return this.client.messages.create({
          to: recipient,
          body: this.replaceNewLines(message),
          from: this.messagingServiceSid,
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
    const hashedPwd = await bcrypt.hash(password, SALT_ROUNDS)

    const callbackUrl = new URL(config.get('backendUrl'))
    callbackUrl.username = username
    // encode password as the hash contains special characters
    callbackUrl.password = encodeURIComponent(hashedPwd)
    callbackUrl.pathname = `${callbackUrl.pathname}/campaign/${campaignId}/message/${messageId}`
    logger.info(`Status callback url for ${messageId}: ${callbackUrl}`)
    return callbackUrl.toString()
  }

  private replaceNewLines(body: string): string {
    return (body || '').replace(/<br\s*\/?>/g, '\n')
  }
}
