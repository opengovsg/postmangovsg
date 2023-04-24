import { PhoneNumberService } from '@core/services'
import config from '@core/config'
import { InvalidRecipientError } from '@core/errors'
import WhatsappClient from '@shared/clients/whatsapp-client.class'
import { loggerWithLabel } from '@core/logger'

const logger = loggerWithLabel(module)

const whatsappClient: WhatsappClient = new WhatsappClient({
  baseUrl: config.get('whatsapp.endpointUrl'),
  bearerToken: config.get('whatsapp.bearerToken'),
  version: config.get('whatsapp.endpointVersion'),
})

const sendMessage = (from: string, recipient: string, content: any) => {
  try {
    // strip out the plus sign afterwards
    recipient = PhoneNumberService.normalisePhoneNumber(
      recipient,
      config.get('defaultCountry')
    ).substring(1)
  } catch (err) {
    throw new InvalidRecipientError('Invalid phone number')
  }

  return whatsappClient.sendMessage(from, recipient, content)
}

const getPhoneNumbers = (wabaId: string) => {
  logger.info({ message: wabaId })
  return whatsappClient.getPhoneNumbers(wabaId)
}

const getTemplates = (wabaId: string) => {
  logger.info({ message: wabaId })
  return whatsappClient.getTemplates(wabaId)
}
export const WhatsappService = {
  whatsappClient,
  sendMessage,
  getPhoneNumbers,
  getTemplates,
}
