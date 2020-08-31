import { Sequelize } from 'sequelize-typescript'
import config from './config'
import { MutableConfig, generateRdsIamAuthToken } from './util/rds-iam'

const sequelizeLoader = async (): Promise<Sequelize> => {
  try {
    const dialectOptions = config.get('IS_PROD')
      ? config.get('database.dialectOptions')
      : {}
    const sequelize = new Sequelize(config.get('database.databaseUri'), {
      dialect: 'postgres',
      logging: false,
      pool: config.get('database.poolOptions'),
      dialectOptions,
      hooks: {
        beforeConnect: async (dbConfig: MutableConfig): Promise<void> => {
          if (config.get('database.useIam')) {
            dbConfig.password = await generateRdsIamAuthToken(dbConfig)
          }
        },
      },
    })
    await sequelize.authenticate()
    console.log('Connection has been established successfully.')
    return sequelize
  } catch (error) {
    console.error('Unable to connect to the database:', error)
    throw error
  }
}

export default sequelizeLoader
