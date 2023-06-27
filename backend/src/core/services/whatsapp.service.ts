import WhatsAppClient from '@shared/clients/whatsapp-client.class'
import FlamingoDbClient, {
  SequelizeQueryClient,
} from '@shared/clients/flamingo-db-client.class'
import config from '@core/config'
import { Sequelize } from 'sequelize'

const whatsappClient = new WhatsAppClient(config.get('whatsapp'))

const flamingoDbSequelize = new Sequelize(config.get('flamingo.dbUri'), {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: {
      rejectUnauthorized: false,
    },
  },
})
// ugly casting to make things work ugh
const flamingoDbClient = new FlamingoDbClient(
  flamingoDbSequelize as unknown as SequelizeQueryClient
)

export const WhatsAppService = {
  whatsappClient,
  flamingoDbClient,
}
