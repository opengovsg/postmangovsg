import Telegraf from 'telegraf'
import { Update } from 'telegraf/typings/telegram-types'

import { startCommandHandler } from './handlers/start'

/**
 * Instantiates a Telegraf instance to handle the incoming Telegram update.
 * @param update Incoming Telegram update
 * @param botToken Bot token
 */
export const handleUpdate = async (
  update: Update,
  botToken: string
): Promise<void> => {
  // Instantiate bot
  const bot = new Telegraf(botToken)

  // Attach handlers
  bot.command('start', startCommandHandler)

  // Handle update
  await bot.handleUpdate(update)
  return
}
