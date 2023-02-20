import twilio from 'twilio'
import { InvalidRecipientError, RateLimitError } from '@core/errors'
import { TwilioCredentials } from '@shared/clients/twilio-client.class'

// find details on API here: https://www.twilio.com/docs/sms/api/pricing
interface MessageCountryPricing {
  country: string
  outboundSmsPrices: OutboundSmsPrice[]
  priceUnit: string
  url: string
}

interface OutboundSmsPrice {
  carrier: string
  prices: Price[]
}

interface Price {
  base_price: string
  current_price: string
  number_type: string
}

export default class TwilioClient {
  private client: any
  private messagingServiceSid: string

  constructor(credential: TwilioCredentials) {
    const { accountSid, apiKey, apiSecret, messagingServiceSid } = credential
    this.client = twilio(apiKey, apiSecret, { accountSid })
    this.messagingServiceSid = messagingServiceSid
  }

  // refactor to use worker class with callback url
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

  async getOutgoingSMSPriceSingaporeUSD(): Promise<number> {
    const messageCountryPricing: MessageCountryPricing =
      await this.client.pricing.v1.messaging.countries('SG').fetch()
    return parseFloat(
      messageCountryPricing.outboundSmsPrices[0].prices[0].base_price
    )
  }
}
