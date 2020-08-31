import Telegraf from 'telegraf'
import { Update } from 'telegraf/typings/telegram-types'
import { TelegrafContext } from 'telegraf/typings/context'
import { Credential } from '@core/models'
import logger from '@core/logger'
import {
  startCommandHandler,
  contactMessageHandler,
  helpCommandHandler,
  updatenumberCommandHandler,
} from '@telegram/utils/callback/handlers'
import { PostmanTelegramError } from '@telegram/utils/callback/PostmanTelegramError'

/**
 * Verifies that the given bot id is registered, otherwise throws an error.
 */
const verifyBotIdRegistered = async (botId: string): Promise<void> => {
  const botIdExists = await Credential?.sequelize?.query(
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
const verifyBotToken = async (
  bot: Telegraf<TelegrafContext>
): Promise<void> => {
  try {
    await bot.telegram.getMe()
    logger.info('Bot token verified.')
  } catch (err) {
    throw new Error('Bot token invalid.')
  }
}

const handleUpdate = async (
  botId: string,
  botToken: string,
  update: Update
): Promise<void> => {
  // Instantiate bot
  const bot = new Telegraf(botToken)

  // Verify botToken
  await verifyBotToken(bot)

  // Attach handlers
  bot.command('start', startCommandHandler)
  bot.command('updatenumber', updatenumberCommandHandler)
  bot.command('help', helpCommandHandler)
  bot.on('contact', contactMessageHandler(botId))

  // Handle update
  try {
    await bot.handleUpdate(update)
  } catch (err) {
    const chatId = update.message?.from?.id
    if (chatId) {
      const errorMessage =
        err instanceof PostmanTelegramError
          ? `Error: ${err.message}, please try again.`
          : 'An error occurred, please try again.'
      await bot.telegram.sendMessage(chatId, errorMessage)
    }

    // Rethrow error
    throw err
  }
}
export const TelegramCallbackService = { verifyBotIdRegistered, handleUpdate }
