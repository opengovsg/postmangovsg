import twilio, { Twilio } from 'twilio'
import { URL } from 'url'
import RequestClient from 'twilio/lib/base/RequestClient'
import Response from 'twilio/lib/http/response'
import { TwilioCredentials } from '@sms/interfaces'
import logger from '@core/logger'
import config from '@core/config'

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

export default class TwilioClient {
  private client: any
  private messagingServiceSid: string

  constructor(credential: TwilioCredentials) {
    const { accountSid, apiKey, apiSecret, messagingServiceSid } = credential
    const opts: Twilio.TwilioClientOptions = { accountSid }
    if (TWILIO_API_ROOT !== config.default('smsOptions.apiRoot')) {
      opts.httpClient = new CustomRequestClient(TWILIO_API_ROOT)
    }

    this.client = twilio(apiKey, apiSecret, opts)
    this.messagingServiceSid = messagingServiceSid
  }

  public send(
    recipient: string,
    message: string,
    forceDelivery = false
  ): Promise<string | void> {
    return this.client.messages
      .create({
        to: recipient,
        body: this.replaceNewLines(message),
        from: this.messagingServiceSid,
        forceDelivery: forceDelivery,
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
      .catch((error: Error) => {
        // Handle +65802 errors by forcing delivery once
        if (
          /\+65802\d+ is not a valid phone number/.test(error.message) &&
          !forceDelivery
        ) {
          return this.send(recipient, message, true)
        }
        return Promise.reject(new Error(error.message))
      })
  }

  /**
   * Replace html new lines in the message with escaped new lines so that they render correctly
   * on the mobile phone
   * @param body
   */
  private replaceNewLines(body: string): string {
    return (body || '').replace(/<br\s*\/?>/g, '\n')
  }
}
