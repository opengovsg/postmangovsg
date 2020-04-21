import { Sequelize } from 'sequelize-typescript'

import config from '@core/config'
import logger from '@core/logger'

const DB_URI = config.database.databaseUri

class SequelizeLoader {
  private static _sequelize: Sequelize | undefined
  static get sequelize(): Sequelize | undefined {
    return this._sequelize
  }
  static async load(): Promise<void> {
    const dialectOptions = config.IS_PROD ? { ...config.database.dialectOptions } : {}
    const sequelize = new Sequelize(DB_URI, {
      dialect: 'postgres',
      logging: false,
      pool: config.database.poolOptions,
      ...dialectOptions,
    })
  
    try {
      this._sequelize = await sequelize.sync()
      logger.info({ message: 'Database loaded.' })
    } catch (err) {
      logger.error(`Unable to connect to database: ${err}`)
      process.exit(1)
    }
  }
}


export default SequelizeLoader