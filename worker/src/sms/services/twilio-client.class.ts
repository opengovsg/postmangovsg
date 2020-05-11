import twilio from 'twilio'
import bcrypt from 'bcrypt'
import config from '@core/config'
import { TwilioCredentials } from '@sms/interfaces'

const SALT_ROUNDS = 10
export default class TwilioClient {
  private client: any;
  private messagingServiceSid: string;

  constructor(credential: TwilioCredentials) {
    const { accountSid, apiKey, apiSecret, messagingServiceSid } = credential
    this.client = twilio(apiKey, apiSecret, { accountSid })
    this.messagingServiceSid = messagingServiceSid
  }

  public send(messageId: number, campaignId: number, recipient: string, message: string): Promise<string | void> {
    return this.generateUsernamePassword(messageId, campaignId)
    .then(({username, password}) => {
      const protocolRegex = /^https?:\/\//
      const trucatedUrl = config.smsOptions.callbackBackendUrl.replace(protocolRegex,'')
      const protocol = config.smsOptions.callbackBackendUrl.match(protocolRegex)?.[0] || ''
      // encode password as the hash contains special characters
      const callbackUrl = `${protocol}${username}:${encodeURIComponent(password)}@${trucatedUrl}`

      return this.client.messages.create({
        to: this.addDefaultCountryCode(recipient),
        body: this.replaceNewLines(message),
        from: this.messagingServiceSid,
        statusCallback: `${callbackUrl}/campaign/${campaignId}/message/${messageId}`
      })
    })
    .then((result: { [key: string]: string }) => {
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
    .catch((error) => {
      return Promise.reject(new Error(error.message))
    })
  }

  private generateUsernamePassword(messageId: number, campaignId: number): Promise<{username: string; password: string}> {
    const username = Math.random().toString(36).substring(2, 15) // random string
    const password = username + messageId + campaignId + config.smsOptions.callbackSecret
    return this.generateHash(password)
      .then((hashedPwd: string) => {
        return { username, password: hashedPwd }
      })
      .catch(error => {
        throw error
      })
  }

  private generateHash(value: string): Promise<string> {
    return new Promise((resolve, reject) => {
      bcrypt.hash(value, SALT_ROUNDS, (error: string, hash: string) => {
        if (error) {
          reject(new Error(`Failed to hash value: ${error}`))
        }
        resolve(hash)
      })
    })
  }

  private addDefaultCountryCode(recipient: string): string {
    if (!recipient.startsWith('+') && config.defaultCountryCode) {
      return `+${config.defaultCountryCode}${recipient}`
    }
    return recipient
  }

  private replaceNewLines(body: string): string {
    return (body||'').replace(/<br\s*\/?>/g, '\n')
  }
}
