import Telegraf from 'telegraf'
import { Update } from 'telegraf/typings/telegram-types'
import { Sequelize } from 'sequelize-typescript'

import { startCommandHandler } from './handlers/start'
import { contactMessageHandler } from './handlers/contact'
import { updatenumberCommandHandler } from './handlers/updatenumber'
import { PostmanTelegramError } from './PostmanTelegramError'

/**
 * Instantiates a Telegraf instance to handle the incoming Telegram update.
 */
export const handleUpdate = async (
  botId: string,
  botToken: string,
  update: Update,
  sequelize: Sequelize
): Promise<void> => {
  // Instantiate bot
  const bot = new Telegraf(botToken)

  // Attach handlers
  bot.command('start', startCommandHandler)
  bot.command('updatenumber', updatenumberCommandHandler)
  bot.on('contact', contactMessageHandler(botId, sequelize))

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
