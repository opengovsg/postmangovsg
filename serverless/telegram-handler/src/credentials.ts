import { Sequelize } from 'sequelize-typescript'
import Telegraf from 'telegraf'
import { TelegrafContext } from 'telegraf/typings/context'

import { Logger } from './utils/logger'

const logger = new Logger('credentials')

/**
 * Verifies that the given bot id is registered, otherwise throws an error.
 */
export const verifyBotIdRegistered = async (
  botId: string,
  sequelize: Sequelize
): Promise<void> => {
  const botIdExists = await sequelize.query(
    `SELECT 1 AS exists FROM credentials WHERE name = :botId;`,
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
 * Verifies that a bot token is valid and not revoked by calling Telegram's `getMe` endpoint.
 */
export const verifyBotToken = async (
  bot: Telegraf<TelegrafContext>
): Promise<void> => {
  try {
    await bot.telegram.getMe()
    logger.log('Bot token verified.')
  } catch (err) {
    throw new Error('Bot token invalid.')
  }
}
