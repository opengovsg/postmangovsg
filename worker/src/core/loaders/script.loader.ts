import { Sequelize } from 'sequelize-typescript'
import config from '@core/config'
import { MutableConfig, generateRdsIamAuthToken } from '@core/utils/rds-iam'

const scriptLoader = async (): Promise<void> => {
  const dialectOptions =
    config.get('env') !== 'development'
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
}

export default scriptLoader
