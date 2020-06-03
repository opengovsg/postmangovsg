import { Sequelize } from 'sequelize-typescript'

import config from './config'

const sequelizeLoader = async (): Promise<Sequelize> => {
  const dialectOptions =
    config.get('env') !== 'development'
      ? config.get('database.dialectOptions')
      : {}
  const sequelize = new Sequelize(config.get('database.databaseUri'), {
    dialect: 'postgres',
    logging: false,
    pool: config.get('database.poolOptions'),
    dialectOptions,
  })
  try {
    await sequelize.authenticate()
    console.log('Connection has been established successfully.')
    return sequelize
  } catch (error) {
    console.error('Unable to connect to the database: ', error)
    process.exit(1)
  }
}

export default sequelizeLoader
