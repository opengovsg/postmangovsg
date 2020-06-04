import Telegraf from 'telegraf'
import { Update } from 'telegraf/typings/telegram-types'

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

  // TODO: Attach handlers
  bot.on('message', (ctx) => ctx.reply('ok'))

  // Handle update
  await bot.handleUpdate(update)
  return
}
