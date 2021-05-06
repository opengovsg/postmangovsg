import { TelegrafContext } from 'telegraf/typings/context'
import { Message, ExtraReplyMessage } from 'telegraf/typings/telegram-types'

import { loggerWithLabel } from '@core/logger'
import { PostmanTelegramError } from '../PostmanTelegramError'
import { TelegramSubscriber, BotSubscriber } from '@telegram/models'

const logger = loggerWithLabel(module)

enum UpsertTelegramSubscriberResult {
  Nothing,
  Failed,
  Created,
  UpdatedPhoneNumber,
  UpdatedTelegramId,
}

/**
 * Upserts a Telegram subscriber.
 *
 * New subscribers are inserted. Existing subscribers with a matching telegramId
 * but different phone number have their phone numbers updated.
 */
const upsertTelegramSubscriber = async (
  phoneNumber: string,
  telegramId: number
): Promise<UpsertTelegramSubscriberResult> => {
  const logMeta = {
    phoneNumber,
    telegramId,
    action: 'upsertTelegramSubscriber',
  }

  // Some Telegram clients send pre-prefixed phone numbers
  if (!phoneNumber.startsWith('+')) {
    phoneNumber = `+${phoneNumber}`
  }

  const result = await TelegramSubscriber.sequelize?.transaction(
    async (transaction) => {
      /**
       * Split into 4 cases:
       * Same telegram ID, same phone number: do nothing.
       * Same telegram ID, different phone number: update phone number.
       * Different telegram ID, same phone number: update telegram ID.
       * Different telegram ID, different phone number: create new mapping.
       */
      const curExactSubscriber = await TelegramSubscriber.findOne({
        transaction,
        where: { phoneNumber, telegramId },
      })
      if (curExactSubscriber) {
        return UpsertTelegramSubscriberResult.Nothing
      }

      const curSubscriberWithPhoneNumber = await TelegramSubscriber.findOne({
        transaction,
        where: {
          phoneNumber,
        },
      })
      if (curSubscriberWithPhoneNumber) {
        curSubscriberWithPhoneNumber.telegramId = telegramId
        await curSubscriberWithPhoneNumber.save({ transaction })
        return UpsertTelegramSubscriberResult.UpdatedTelegramId
      }

      const curSubscriberWithTelegramId = await TelegramSubscriber.findOne({
        transaction,
        where: {
          telegramId,
        },
      })
      if (curSubscriberWithTelegramId) {
        // todo: fix this. this doesn't work because phoneNumber is a primary key
        // and sequelize doesn't allow updates for primary keys.
        curSubscriberWithTelegramId.phoneNumber = phoneNumber
        await curSubscriberWithTelegramId.save({ transaction })
        return UpsertTelegramSubscriberResult.UpdatedPhoneNumber
      }

      await TelegramSubscriber.create(
        {
          phoneNumber,
          telegramId,
        },
        {
          transaction,
        }
      )
      return UpsertTelegramSubscriberResult.Created
    }
  )

  logger.info({ message: 'Upserted Telegram subscriber', result, ...logMeta })
  return result ?? UpsertTelegramSubscriberResult.Failed
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
export const contactMessageHandler = (botId: string) => async (
  ctx: TelegrafContext
): Promise<Message> => {
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
  const upsertResult = await upsertTelegramSubscriber(phoneNumber, telegramId)
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
    reply = 'You are already subscribed.'
  }

  switch (upsertResult) {
    case UpsertTelegramSubscriberResult.Nothing:
    case UpsertTelegramSubscriberResult.Created:
      reply += ' Your account has been updated.'
      break
    case UpsertTelegramSubscriberResult.UpdatedPhoneNumber:
      reply += ' Your phone number has been updated.'
      break
    case UpsertTelegramSubscriberResult.UpdatedTelegramId:
      reply += ' Your Telegram ID has been updated.'
      break
    case UpsertTelegramSubscriberResult.Failed:
      reply += ' An internal failure has occurred.'
      break
  }

  return ctx.reply(reply, replyOptions)
}
