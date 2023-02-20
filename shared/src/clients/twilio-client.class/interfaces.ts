export interface TwilioCredentials {
  accountSid: string
  apiKey: string
  apiSecret: string
  messagingServiceSid: string

  callbackSecret?: string

  callbackBaseUrl?: string
}

export interface MessageCountryPricing {
  country: string
  outboundSmsPrices: OutboundSmsPrice[]
  priceUnit: string
  url: string
}

export interface OutboundSmsPrice {
  carrier: string
  prices: Price[]
}

export interface Price {
  base_price: string
  current_price: string
  number_type: string
}
