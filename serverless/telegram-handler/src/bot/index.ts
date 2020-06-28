import Telegraf from 'telegraf'
import { Update } from 'telegraf/typings/telegram-types'
import { Sequelize } from 'sequelize-typescript'

import { startCommandHandler } from './handlers/start'
import { contactMessageHandler } from './handlers/contact'
import { updatenumberCommandHandler } from './handlers/updatenumber'

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
  await bot.handleUpdate(update)
  return
}
