import twilio from 'twilio'
import { TwilioCredentials } from '@sms/interfaces'
import { RateLimitError, InvalidRecipientError } from '@core/errors'

export default class TwilioClient {
  private client: any
  private messagingServiceSid: string

  constructor(credential: TwilioCredentials) {
    const { accountSid, apiKey, apiSecret, messagingServiceSid } = credential
    this.client = twilio(apiKey, apiSecret, { accountSid })
    this.messagingServiceSid = messagingServiceSid
  }

  async send(
    recipient: string,
    message: string,
    forceDelivery = false
  ): Promise<string> {
    try {
      const {
        status,
        sid,
        error_code: errorCode,
        code,
      } = await this.client.messages.create({
        to: recipient,
        body: this.replaceNewLines(message),
        from: this.messagingServiceSid,
        forceDelivery,
      })

      if (!sid) {
        throw new Error(`${status};Unknown error`)
      }

      if (errorCode || code) {
        throw new Error(`${sid};${errorCode};${code}`)
      }

      return sid
    } catch (error) {
      // Handle +65802 errors by forcing delivery once
      if (
        /\+65802\d+ is not a valid phone number/.test(
          (error as Error).message
        ) &&
        !forceDelivery
      ) {
        return this.send(recipient, message, true)
      }

      // 20429 - REST API rate limit exceeded
      // 21611 - Message queue limit exceeded
      if ([20429, 21611].includes((error as any).code)) {
        throw new RateLimitError()
      }

      if ((error as any).code === 21211) {
        throw new InvalidRecipientError('Invalid phone number')
      }

      throw error
    }
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
