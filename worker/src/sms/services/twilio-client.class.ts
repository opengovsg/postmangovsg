import twilio from 'twilio'
import bcrypt from 'bcrypt'
import logger from '@core/logger'
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

  public send(messageId: number, recipient: string, message: string, campaignId?: number): Promise<string | void> {
    return this.generateUsernamePassword(messageId, campaignId)
      .then(({ username, password }) => {
        let callbackUrl= new URL(config.get('backendUrl'))
        callbackUrl.username = username
        // encode password as the hash contains special characters
        callbackUrl.password = encodeURIComponent(password)
        callbackUrl.pathname = `${callbackUrl.pathname}/campaign/${campaignId}/message/${messageId}`
        logger.info(`Status callback url for ${messageId}: ${callbackUrl}`)

        return this.client.messages.create({
          to: this.addDefaultCountryCode(recipient),
          body: this.replaceNewLines(message),
          from: this.messagingServiceSid,
          statusCallback: callbackUrl.toString(),
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

  private generateUsernamePassword(messageId: number, campaignId?: number): Promise<{username: string; password: string}> {
    const username = Math.random().toString(36)
      .substring(2, 15) // random string
    const password = username + messageId + campaignId + config.get('twilioCallbackSecret')
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
      bcrypt.hash(value, SALT_ROUNDS, (error: Error, hash: string) => {
        if (error) {
          reject(new Error(`Failed to hash value: ${error}`))
        }
        resolve(hash)
      })
    })
  }

  private addDefaultCountryCode(recipient: string): string {
    if (!recipient.startsWith('+') && config.get('defaultCountryCode')) {
      return `+${config.get('defaultCountryCode')}${recipient}`
    }
    return recipient
  }

  private replaceNewLines(body: string): string {
    return (body||'').replace(/<br\s*\/?>/g, '\n')
  }
}
