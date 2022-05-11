import { Sequelize } from 'sequelize'
import axios from 'axios'

import { Logger } from './utils/logger'
import config from './config'
import sequelizeLoader from './sequelize-loader'

const logger = new Logger('unsubscribe')

const client = axios.create({
  baseURL: config.get('slackWebhookUrl'),
  timeout: 4000,
})

let sequelize: Sequelize | undefined

export const init = async (): Promise<void> => {
  if (!sequelize) {
    sequelize = await sequelizeLoader()
  }
}

// export const getUsageStatistics = async (): Promise<UsageStatistics> => {}

// export const sendStatisticsToSlackChannel = async ({
//   args
// }: UsageStatisticsDigest): Promise<void> => {
//   // TODO
// }
