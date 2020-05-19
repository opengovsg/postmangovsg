import { Sequelize, SequelizeOptions } from 'sequelize-typescript'
import config from './config'

const sequelizeLoader = async () => {
  const dialectOptions = config.IS_PROD ? { ...config.database.dialectOptions } : {}
  const sequelize = new Sequelize(config.database.databaseUri, {
    dialect: 'postgres',
    logging: false,
    pool: config.database.poolOptions,
    dialectOptions,
  } as SequelizeOptions)

  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
    return sequelize
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1)
  }
}

export default sequelizeLoader