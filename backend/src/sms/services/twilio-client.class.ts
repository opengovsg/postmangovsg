import twilio from 'twilio'
import { TwilioCredentials } from '@sms/interfaces'

export default class TwilioClient {
  private client: any
  private messagingServiceSid: string

  constructor(credential: TwilioCredentials) {
    const { accountSid, apiKey, apiSecret, messagingServiceSid } = credential
    this.client = twilio(apiKey, apiSecret, { accountSid })
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
