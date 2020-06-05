import Telegraf from 'telegraf'
import { Update } from 'telegraf/typings/telegram-types'
import { Sequelize } from 'sequelize-typescript'

import { startCommandHandler } from './handlers/start'
import { contactMessageHandler } from './handlers/contact'

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
  bot.on('contact', contactMessageHandler(botId, sequelize))

  // Handle update
  await bot.handleUpdate(update)
  return
}
