import { PhoneNumberService } from '@core/services'
import config from '@core/config'
import { InvalidRecipientError } from '@core/errors'
import WhatsappClient from '@shared/clients/whatsapp-client.class'

// const logger = loggerWithLabel(module)

const whatsappClient: WhatsappClient = new WhatsappClient({
  baseUrl: config.get('whatsapp.endpointUrl'),
  bearerToken: config.get('whatsapp.bearerToken'),
  version: config.get('whatsapp.endpointVersion'),
})

const sendMessage = (from: string, recipient: string, content: any) => {
  try {
    recipient = PhoneNumberService.normalisePhoneNumber(
      recipient,
      config.get('defaultCountry')
    ).substring(1)
    // strip out the plus sign afterwards
  } catch (err) {
    throw new InvalidRecipientError('Invalid phone number')
  }

  return whatsappClient.sendMessage(from, recipient, content)
}

export const WhatsappService = {
  whatsappClient,
  sendMessage,
}
