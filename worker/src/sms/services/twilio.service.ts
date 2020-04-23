import twilio from 'twilio'
import { TwilioCredentials } from '@sms/interfaces/credentials.interface'

export class TwilioService {
  private client: any;
  private messagingServiceSid: string;

  constructor(credential: TwilioCredentials) {
    const { accountSid, apiKey, apiSecret, messagingServiceSid } = credential
    this.client = twilio(apiKey, apiSecret, { accountSid })
    this.messagingServiceSid = messagingServiceSid
  }

  public send(recipient: string, message: string): Promise<string | void>{
    return this.client.messages.create({
      to: recipient,
      body: message,
      from: this.messagingServiceSid,
    }).then((result: {[key: string]: string}) => {
      const { status, sid, error_code: errorCode, code } = result
      if(sid){
        if(errorCode || code){
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
}