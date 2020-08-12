import { Sequelize } from 'sequelize-typescript'
import config from './../config'

export let sequelize: Sequelize | null = null

/**
 * Initialize database connection
 */
export const sequelizeLoader = async (): Promise<Sequelize> => {
  try {
    sequelize = new Sequelize(config.get('database.databaseUri'), {
      dialect: 'postgres',
      logging: false,
    })
    await sequelize.authenticate()
    console.log('Connection to database has been established successfully.')
    return sequelize
  } catch (error) {
    console.error('Unable to connect to the database:', error)
    throw error
  }
}
