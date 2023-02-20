import { MessageCountryPricing, TwilioCredentials } from './interfaces'
import twilio from 'twilio'
import { getSha256Hash } from '../../utils/crypto'

export * from './interfaces'

// refactor to pass in callback secret & backendUrl from callee

// for now, refactored backend API twilio client to use from shared.
// @TODO In future, refactor worker to also use from shared

export default class TwilioClient {
  private client: any
  private messagingServiceSid: string
  private readonly callbackSecret: string | undefined
  private readonly callbackBaseUrl: string | undefined

  constructor(credential: TwilioCredentials) {
    const { accountSid, apiKey, apiSecret, messagingServiceSid } = credential
    this.client = twilio(apiKey, apiSecret, { accountSid })
    this.messagingServiceSid = messagingServiceSid
    this.callbackSecret = credential.callbackSecret
    this.callbackBaseUrl = credential.callbackBaseUrl
  }

  public send(
    recipient: string,
    message: string,
    forceDelivery = false
  ): Promise<string | void> {
    return this.generateStatusCallbackUrl()
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
          return this.send(recipient, message, true)
        }
        return Promise.reject(new Error(error.message))
      })
  }

  // you dont need the message id... it is passed in the payload
  // you also dont need campaign id..
  private async generateStatusCallbackUrl(): Promise<string | undefined> {
    console.log('callbackSecret IS: ', this.callbackSecret)
    console.log('callbackBaseUrl IS: ', this.callbackBaseUrl)

    if (!this.callbackSecret || !this.callbackBaseUrl) return undefined

    const username = Math.random().toString(36).substring(2, 15) // random string
    const password: string = username
    const hashedPwd = getSha256Hash(this.callbackSecret, password)

    const callbackUrl = new URL(this.callbackBaseUrl)
    callbackUrl.username = username
    // encode password as the hash contains special characters
    callbackUrl.password = encodeURIComponent(hashedPwd)
    callbackUrl.pathname = `${callbackUrl.pathname}`
    return callbackUrl.toString()
  }

  private replaceNewLines(body: string): string {
    return (body || '').replace(/<br\s*\/?>/g, '\n')
  }

  async getOutgoingSMSPriceSingaporeUSD(): Promise<number> {
    const messageCountryPricing: MessageCountryPricing =
      await this.client.pricing.v1.messaging.countries('SG').fetch()
    return parseFloat(
      messageCountryPricing.outboundSmsPrices[0].prices[0].base_price
    )
  }
}
