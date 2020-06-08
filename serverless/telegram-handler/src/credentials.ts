import AWS from 'aws-sdk'
import { Sequelize } from 'sequelize-typescript'

import config from './config'
import { Logger } from './utils/logger'

const logger = new Logger('credentials')

const secretsManager = new AWS.SecretsManager({
  region: config.get('aws.awsRegion'),
})

/**
 * Verifies that the given bot id is registered, otherwise throws an error.
 */
export const verifyBotIdRegistered = async (
  botId: string,
  sequelize: Sequelize
): Promise<void> => {
  const { exists: botIdExists } = await sequelize.query(
    `SELECT EXISTS (SELECT * FROM credentials WHERE name = :botId);`,
    {
      replacements: {
        botId,
      },
      plain: true,
    }
  )
  if (!botIdExists) {
    throw new Error(`botId ${botId} not recognized.`)
  }
}

/**
 * Fetches a bot token for the given bot id.
 *
 * In development, this returns the configured `DEV_SERVER_BOT_TOKEN` env var.
 * Otherwise, the bot token is fetched from AWS Secrets Manager.
 */
export const getBotTokenFromId = async (botId: string): Promise<string> => {
  if (config.get('env') === 'development') {
    logger.log('Dev env - returning DEV_SERVER_BOT_TOKEN')

    const { botToken } = config.get('devServer')
    return botToken
  }

  logger.log('Getting bot token from Secrets Manager')
  const data = await secretsManager
    .getSecretValue({
      SecretId: botId,
    })
    .promise()
  logger.log('Gotten bot token from Secrets Manager')

  const botToken = data.SecretString
  if (!botToken) throw new Error('Bot token missing in Secrets manager')

  return botToken
}
