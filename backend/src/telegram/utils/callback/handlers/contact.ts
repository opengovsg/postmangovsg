import { TelegrafContext } from 'telegraf/typings/context'
import { Message, ExtraReplyMessage } from 'telegraf/typings/telegram-types'
import { QueryTypes } from 'sequelize'

import { loggerWithLabel } from '@core/logger'
import { PostmanTelegramError } from '../PostmanTelegramError'
import { TelegramSubscriber, BotSubscriber } from '@shared/core/models/telegram'

const logger = loggerWithLabel(module)

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
  const logMeta = {
    phoneNumber,
    telegramId,
    action: 'upsertTelegramSubscriber',
  }

  // Some Telegram clients send pre-prefixed phone numbers
  if (!phoneNumber.startsWith('+')) {
    phoneNumber = `+${phoneNumber}`
  }

  const success = await TelegramSubscriber.sequelize?.transaction(
    async (transaction) => {
      /**
       * Split into 2 scenarios:
       * 1. a row with matching phone_number or telegram_id: update the row
       * 2. no row matches: insert a new row
       *
       * Note: we have to use a raw query to update the phone_number.
       * It is a primary key, and sequelize doesn't allow us to update
       * primary keys in sequelize models.
       */
      const result = await TelegramSubscriber.sequelize?.query(
        `
        UPDATE telegram_subscribers
        SET phone_number = :phoneNumber, telegram_id = :telegramId, updated_at = clock_timestamp()
        WHERE phone_number = :phoneNumber OR telegram_id = :telegramId;
        `,
        {
          transaction,
          type: QueryTypes.UPDATE,
          replacements: { phoneNumber, telegramId },
        }
      )

      const updatedCount = result?.[1]
      if (!updatedCount) {
        await TelegramSubscriber.create(
          { telegramId, phoneNumber } as TelegramSubscriber,
          { transaction }
        )
      }

      return true
    }
  )

  logger.info({ message: 'Upserted Telegram subscriber', ...logMeta })
  return success ?? false
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
  const logMeta = { botId, telegramId, action: 'addBotSubscriber' }
  const [, created] = await BotSubscriber.findOrCreate({
    where: { botId, telegramId },
  })
  logger.info({
    message: created
      ? `Upserted Bot subscriber`
      : `Bot subscriber already exists`,
    ...logMeta,
  })
  return created
}

/**
 * Handles updates with contacts.
 */
export const contactMessageHandler =
  (botId: string) =>
  async (ctx: TelegrafContext): Promise<Message> => {
    logger.info({
      from: ctx.from,
      contact: ctx.message?.contact,
      botId,
      action: 'contactMessageHandler',
    })

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
    const upserted = await upsertTelegramSubscriber(phoneNumber, telegramId)
    const didAddBotSubscriber = await addBotSubscriber(botId, telegramId)

    // Respond
    const replyOptions: ExtraReplyMessage = {
      reply_markup: {
        remove_keyboard: true,
      },
    }

    // Configure bot reply based on what actually happened
    let reply
    if (didAddBotSubscriber) {
      reply = 'You are now subscribed.'
    } else {
      reply = 'You were already subscribed.'
    }

    if (upserted) {
      reply += ' Your phone number and Telegram ID have been updated.'
    } else {
      reply += ' An internal failure has occurred.'
    }

    return ctx.reply(reply, replyOptions)
  }
