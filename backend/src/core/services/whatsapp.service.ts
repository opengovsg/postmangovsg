import WhatsAppClient from '@shared/clients/whatsapp-client.class'
import FlamingoDbClient, {
  SequelizeQueryClient,
} from '@shared/clients/flamingo-db-client.class'
import config from '@core/config'
import { Sequelize } from 'sequelize'

const isLocal = config.get('env') === 'development'

const whatsappClient = new WhatsAppClient(config.get('whatsapp'), isLocal)

const flamingoDbSequelize = new Sequelize(config.get('flamingo.dbUri'), {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: {
      rejectUnauthorized: false,
    },
  },
  pool: config.get('database.poolOptions'),
})
// ugly casting to make things work ugh
const flamingoDbClient = new FlamingoDbClient(
  flamingoDbSequelize as unknown as SequelizeQueryClient
)

export const whatsappService = {
  whatsappClient,
  flamingoDbClient,
}
