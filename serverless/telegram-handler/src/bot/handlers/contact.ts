import { TelegrafContext } from 'telegraf/typings/context'
import { Sequelize } from 'sequelize-typescript'
import { Message, ExtraReplyMessage } from 'telegraf/typings/telegram-types'

import { Logger } from '../../utils/logger'

const logger = new Logger('contact')

/**
 * Upserts a Telegram subscriber.
 *
 * New subscribers are inserted. Existing subscribers with a matching telegramId
 * but different phone number have their phone numbers updated.
 */
const upsertTelegramSubscriber = async (
  phoneNumber: string,
  telegramId: number,
  sequelize: Sequelize
): Promise<boolean> => {
  logger.log(`Upserting Telegram subscriber: ${phoneNumber} -> ${telegramId}`)
  const affectedRows = (
    await sequelize.query(
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
  )[1] as number
  logger.log(`Upserted ${affectedRows} Telegram subscriber`)

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
  telegramId: number,
  sequelize: Sequelize
): Promise<boolean> => {
  logger.log(`Upserting bot subscriber: ${telegramId} -> bot ${botId}`)
  const affectedRows = (
    await sequelize.query(
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
  )[1] as number
  logger.log(`Upserted ${affectedRows} bot subscription`)

  return affectedRows > 0
}

/**
 * Handles updates with contacts.
 */
export const contactMessageHandler = (
  botId: string,
  sequelize: Sequelize
) => async (ctx: TelegrafContext): Promise<Message> => {
  logger.log(ctx.from?.id.toString())

  // Parse contact data
  const contact = ctx.message?.contact
  if (!contact) {
    throw new Error('Contact not defined')
  }

  const { phone_number: phoneNumber, user_id: telegramId } = contact
  if (!(phoneNumber && telegramId)) {
    await ctx.reply('Error: Invalid contact information.')
    throw new Error('Invalid contact information')
  }

  const senderTelegramId = ctx.from?.id
  if (!senderTelegramId || telegramId !== senderTelegramId) {
    await ctx.reply('Error: You can only update your own bot subscription.')
    throw new Error('Sender and contact Telegram ID mismatch')
  }

  // Upsert and add subscriptions
  const didUpsertTelegramSubscriber = await upsertTelegramSubscriber(
    phoneNumber,
    telegramId,
    sequelize
  )
  const didAddBotSubscriber = await addBotSubscriber(
    botId,
    telegramId,
    sequelize
  )

  // Respond
  const replyOptions: ExtraReplyMessage = {
    reply_markup: {
      remove_keyboard: true,
    },
  }

  if (!didUpsertTelegramSubscriber && !didAddBotSubscriber) {
    return ctx.reply(
      'Error: Failed to save your subscription. Are you already subscribed?',
      replyOptions
    )
  }
  if (didUpsertTelegramSubscriber && !didAddBotSubscriber) {
    return ctx.reply('Success: Your number has been updated.', replyOptions)
  }

  return ctx.reply('Success: You are now subscribed.', replyOptions)
}
