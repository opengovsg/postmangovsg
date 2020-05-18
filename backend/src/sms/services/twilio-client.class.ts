import twilio from 'twilio'
import config from '@core/config'
import { TwilioCredentials } from '@sms/interfaces'

export default class TwilioClient {
  private client: any;
  private messagingServiceSid: string;

  constructor(credential: TwilioCredentials) {
    const { accountSid, apiKey, apiSecret, messagingServiceSid } = credential
    this.client = twilio(apiKey, apiSecret, { accountSid })
    this.messagingServiceSid = messagingServiceSid
  }

  public send(recipient: string, message: string): Promise<string | void> {
    return this.client.messages.create({
      to: this.addDefaultCountryCode(recipient),
      body: this.replaceNewLines(message),
      from: this.messagingServiceSid,
    }).then((result: { [key: string]: string }) => {
      const { status, sid, error_code: errorCode, code } = result
      if (sid) {
        if (errorCode || code) {
          return Promise.reject(new Error(`${sid};${errorCode};${code}`))
        }
        else {
          return sid
        }
      }
      else {
        return Promise.reject(new Error(`${status};Unknown error`))
      }
    })
  }

  /**
   * Add a default country code if the recipient does not contain one
   * @param recipient 
   */
  private addDefaultCountryCode(recipient: string): string {
    if (!recipient.startsWith('+') && config.get('defaultCountryCode')){
      return `+${config.get('defaultCountryCode')}${recipient}`
    }
    return recipient
  }

  /**
   * Replace html new lines in the message with escaped new lines so that they render correctly
   * on the mobile phone
   * @param body 
   */
  private replaceNewLines(body: string): string {
    return (body||'').replace(/<br\s*\/?>/g, '\n')
  }
}