import { Sequelize } from 'sequelize-typescript'

import config from '@core/config'
import {
  Credential,
  JobQueue,
  Campaign,
  User,
  Worker,
  UserCredential,
  Statistic,
} from '@core/models'
import {
  EmailMessage,
  EmailTemplate,
  EmailOp,
  EmailBlacklist,
} from '@email/models'
import { SmsMessage, SmsTemplate, SmsOp } from '@sms/models'
import logger from '@core/logger'

const DB_URI = config.get('database.databaseUri')
const DB_READ_REPLICA_URI = config.get('database.databaseReadReplicaUri')

class SequelizeLoader {
  private sequelizeReadReplica: Sequelize | null

  constructor() {
    this.sequelizeReadReplica = null
  }

  public async init(): Promise<void> {
    await this.loadMasterDB()
    this.sequelizeReadReplica = await this.loadReadReplicaDB()
  }
  public getSequelizeReadReplicaInstance(): Sequelize | null {
    return this.sequelizeReadReplica
  }

  private loadMasterDB = async (): Promise<void> => {
    const dialectOptions = config.get('IS_PROD')
      ? config.get('database.dialectOptions')
      : {}
    const sequelize = new Sequelize(DB_URI, {
      dialect: 'postgres',
      logging: false,
      pool: config.get('database.poolOptions'),
      dialectOptions,
    })

    const coreModels = [
      Credential,
      JobQueue,
      Campaign,
      User,
      Worker,
      UserCredential,
      Statistic,
    ]
    const emailModels = [EmailMessage, EmailTemplate, EmailOp, EmailBlacklist]
    const smsModels = [SmsMessage, SmsTemplate, SmsOp]
    sequelize.addModels([...coreModels, ...emailModels, ...smsModels])

    try {
      await sequelize.sync()
      logger.info({ message: 'Master database loaded.' })
    } catch (err) {
      logger.error(`Unable to connect to master database: ${err}`)
      process.exit(1)
    }

    await Credential.findCreateFind({ where: { name: 'EMAIL_DEFAULT' } })
  }

  private loadReadReplicaDB = async (): Promise<Sequelize> => {
    const dialectOptions = config.get('IS_PROD')
      ? config.get('database.dialectOptions')
      : {}
    const sequelizeReadReplica = new Sequelize(DB_READ_REPLICA_URI, {
      dialect: 'postgres',
      logging: false,
      pool: config.get('database.poolOptions'),
      dialectOptions,
    })

    try {
      await sequelizeReadReplica.sync()
      logger.info({ message: 'Read replica database loaded.' })
    } catch (err) {
      logger.error(
        `Unable to connect to read replica database database: ${err}`
      )
      process.exit(1)
    }

    return sequelizeReadReplica
  }
}

export default new SequelizeLoader()
