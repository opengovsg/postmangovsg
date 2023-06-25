import WhatsAppClient from '@shared/clients/whatsapp-client.class'
import FlamingoDbClient from '@shared/clients/flamingo-db-client.class'
import config from '@core/config'

const whatsappClient = new WhatsAppClient(config.get('whatsapp'))

const flamingoDbClient = new FlamingoDbClient(config.get('flamingo.dbUri'))

export const WhatsAppService = {
  whatsappClient,
  flamingoDbClient,
}
