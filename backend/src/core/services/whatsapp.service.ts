import WhatsAppClient from '@shared/clients/whatsapp-client.class'
import config from '@core/config'

const whatsappClient = new WhatsAppClient(config.get('whatsapp'))

export const WhatsAppService = {
  whatsappClient,
}
