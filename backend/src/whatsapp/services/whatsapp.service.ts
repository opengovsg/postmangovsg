import { PhoneNumberService } from '@core/services'
import config from '@core/config'
import { InvalidRecipientError } from '@core/errors'
import WhatsappClient from '@shared/clients/whatsapp-client.class'
import { loggerWithLabel } from '@core/logger'

const logger = loggerWithLabel(module)

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

  const client = initializeBasicClient()
  return client.sendMessage(from, recipient, content)
}

const getTemplates = (wabaId: string) => {
  logger.info({ message: wabaId })
  const client = initializeBasicClient()
  return client.getTemplates(wabaId)
}
const initializeBasicClient = () => {
  return new WhatsappClient({
    baseUrl: config.get('whatsapp.endpointUrl'),
    bearerToken: config.get('whatsapp.bearerToken'),
    version: config.get('whatsapp.endpointVersion'),
  })
}
export const WhatsappService = {
  sendMessage,
  getTemplates,
}
