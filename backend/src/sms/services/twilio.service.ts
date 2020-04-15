import twilio from 'twilio'
import { TwilioCredentials } from '@sms/interfaces'
import logger from '@core/logger'

export class TwilioService {
  private client: any;
  private messagingServiceSid: string;

  constructor(credential: TwilioCredentials) {
    const { accountSid, apiKey, apiSecret, messagingServiceSid } = credential
    this.client = twilio(apiKey, apiSecret, { accountSid })
    this.messagingServiceSid = messagingServiceSid
  }

  public async send(recipient: string, message: string): Promise<boolean>{
    const result = await this.client.messages.create({
      to: recipient,
      body: message,
      from: this.messagingServiceSid,
    })
    const { status, sid, error_codes: errorCode } = result
    if (!sid || errorCode) {
      logger.error(`send: SMS Message error with status=${status} error_code=${errorCode} sid=${sid}`)
      return false
    }
    return true
  }
}