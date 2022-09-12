import Telegraf from 'telegraf'
import { Update } from 'telegraf/typings/telegram-types'
import { TelegrafContext } from 'telegraf/typings/context'
import { Credential } from '@core/models'
import { loggerWithLabel } from '@core/logger'
import {
  startCommandHandler,
  contactMessageHandler,
  helpCommandHandler,
  updatenumberCommandHandler,
} from '@telegram/utils/callback/handlers'
import { PostmanTelegramError } from '@telegram/utils/callback/PostmanTelegramError'
import { Op } from 'sequelize'

const logger = loggerWithLabel(module)

/**
 * Verifies that the given bot id is registered
 */
const verifyBotIdRegistered = async (botId: string): Promise<boolean> => {
  const botIdExists = await Credential.findOne({
    where: {
      // before this change https://github.com/opengovsg/postmangovsg/pull/1414
      // we used to save only the secret by botId, hence there must be an or condition
      // here to support the legacy credentials as well
      [Op.or]: [{ name: botId }, { name: `${process.env.NODE_ENV}-${botId}` }],
    },
  })
  return !!botIdExists
}

/**
 * Verifies that a bot token is valid and not revoked by calling Telegram's `getMe` endpoint.
 */
const verifyBotToken = async (
  bot: Telegraf<TelegrafContext>
): Promise<void> => {
  try {
    await bot.telegram.getMe()
    logger.info({
      message: 'Bot token verified',
      bot,
      action: 'verifyBotToken',
    })
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
