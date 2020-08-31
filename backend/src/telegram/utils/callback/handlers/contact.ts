import { TelegrafContext } from 'telegraf/typings/context'
import { Message, ExtraReplyMessage } from 'telegraf/typings/telegram-types'

import logger from '@core/logger'
import { PostmanTelegramError } from '../PostmanTelegramError'
import { TelegramSubscriber } from '@telegram/models'
/**
 * Upserts a Telegram subscriber.
 *
 * New subscribers are inserted. Existing subscribers with a matching telegramId
 * but different phone number have their phone numbers updated.
 */
const upsertTelegramSubscriber = async (
  phoneNumber: string,
  telegramId: number
): Promise<boolean> => {
  // Some Telegram clients send pre-prefixed phone numbers
  if (!phoneNumber.startsWith('+')) {
    phoneNumber = `+${phoneNumber}`
  }

  logger.info(`Upserting Telegram subscriber: ${phoneNumber} -> ${telegramId}`)
  const result = await TelegramSubscriber?.sequelize?.query(
    `
        INSERT INTO telegram_subscribers (phone_number, telegram_id, created_at, updated_at)
        VALUES (:phoneNumber, :telegramId, clock_timestamp(), clock_timestamp())
        ON CONFLICT (telegram_id) DO UPDATE
        SET phone_number = :phoneNumber, updated_at = clock_timestamp()
        WHERE NOT telegram_subscribers.phone_number = :phoneNumber
      `,
    {
      replacements: {
        phoneNumber,
        telegramId,
      },
    }
  )
  const affectedRows = result ? (result[1] as number) : 0
  logger.info(`Upserted ${affectedRows} Telegram subscriber`)

  return affectedRows > 0
}

/**
 * Adds a bot subscriber.
 *
 * Subscribes a Telegram subscriber to the bot. If the subscription already
 * exists, nothing happens.
 */
const addBotSubscriber = async (
  botId: string,
  telegramId: number
): Promise<boolean> => {
  logger.info(`Upserting bot subscriber: ${telegramId} -> bot ${botId}`)
  const result = await TelegramSubscriber?.sequelize?.query(
    `
        INSERT INTO bot_subscribers (bot_id, telegram_id, created_at, updated_at)
        VALUES (:botId, :telegramId, clock_timestamp(), clock_timestamp())
        ON CONFLICT DO NOTHING
      `,
    {
      replacements: {
        botId,
        telegramId,
      },
    }
  )
  const affectedRows = result ? (result[1] as number) : 0
  logger.info(`Upserted ${affectedRows} bot subscription`)

  return affectedRows > 0
}

/**
 * Handles updates with contacts.
 */
export const contactMessageHandler = (botId: string) => async (
  ctx: TelegrafContext
): Promise<Message> => {
  logger.info(ctx.from?.id.toString() as string)

  // Parse contact data
  const contact = ctx.message?.contact
  if (!contact) {
    throw new PostmanTelegramError('Contact not defined')
  }

  const { phone_number: phoneNumber, user_id: telegramId } = contact
  if (!(phoneNumber && telegramId)) {
    throw new PostmanTelegramError('Invalid contact information')
  }

  const senderTelegramId = ctx.from?.id
  if (!senderTelegramId || telegramId !== senderTelegramId) {
    throw new PostmanTelegramError('Sender and contact mismatch')
  }

  // Upsert and add subscriptions
  await upsertTelegramSubscriber(phoneNumber, telegramId)
  const didAddBotSubscriber = await addBotSubscriber(botId, telegramId)

  // Respond
  const replyOptions: ExtraReplyMessage = {
    reply_markup: {
      remove_keyboard: true,
    },
  }

  if (!didAddBotSubscriber) {
    return ctx.reply('Your phone number has been updated.', replyOptions)
  }
  return ctx.reply('You are now subscribed.', replyOptions)
}
