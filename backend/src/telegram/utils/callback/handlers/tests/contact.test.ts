import { BotSubscriber, TelegramSubscriber } from '@telegram/models'
import sequelizeLoader from '@test-utils/sequelize-loader'
import { Sequelize } from 'sequelize-typescript'

import { TelegrafContext } from 'telegraf/typings/context'

import { contactMessageHandler } from '../contact'

let sequelize: Sequelize
beforeAll(async () => {
  sequelize = await sequelizeLoader(process.env.JEST_WORKER_ID || '1')
})

afterAll(async () => {
  await sequelize.close()
})

describe('contactMessageHandler', () => {
  const botId = '123456789'
  const phoneNumber = '+6591234567'
  const telegramId = 123456789

  const createMockContext = (
    phoneNumber: string,
    userId: number
  ): TelegrafContext => {
    const ctx: any = {
      reply: jest.fn(),
      from: {
        id: userId,
      },
      message: {
        contact: {
          phone_number: phoneNumber,
          user_id: userId,
        },
      },
    }
    return ctx
  }

  const insertBotSubscription = async (
    phoneNumber: string,
    telegramId: number,
    botId: string
  ): Promise<void> => {
    await TelegramSubscriber.create({
      phoneNumber,
      telegramId,
    } as TelegramSubscriber)
    await BotSubscriber.create({
      botId,
      telegramId,
    } as BotSubscriber)
  }

  afterEach(async () => {
    await TelegramSubscriber.destroy({ where: {} })
    await BotSubscriber.destroy({ where: {} })
  })

  test('Insertion of a new Telegram subscriber', async () => {
    const ctx = createMockContext(phoneNumber, telegramId)

    await contactMessageHandler(botId)(ctx)

    const subscriber = await TelegramSubscriber.findOne({
      where: { phoneNumber },
    })
    expect(subscriber).not.toBeNull()

    const botSubscriber = await BotSubscriber.findOne({
      where: { botId, telegramId },
    })
    expect(botSubscriber).not.toBeNull()

    expect(ctx.reply).toBeCalledWith(
      'You are now subscribed. Your phone number and Telegram ID have been updated.',
      { reply_markup: { remove_keyboard: true } }
    )
  })

  test('Update of phone number for existing Telegram subscriber', async () => {
    await insertBotSubscription(phoneNumber, telegramId, botId)
    const newPhoneNumber = '+6581234567'
    const ctx = createMockContext(newPhoneNumber, telegramId)

    await contactMessageHandler(botId)(ctx)

    const subscriber = await TelegramSubscriber.findOne({
      where: { phoneNumber: newPhoneNumber },
    })
    expect(subscriber?.telegramId).toBe(`${telegramId}`)

    const botSubscriber = await BotSubscriber.findOne({
      where: { botId, telegramId },
    })
    expect(botSubscriber).not.toBeNull()

    expect(ctx.reply).toBeCalledWith(
      'You were already subscribed. Your phone number and Telegram ID have been updated.',
      { reply_markup: { remove_keyboard: true } }
    )
  })

  test('Update of Telegram ID for existing Telegram subscriber', async () => {
    await insertBotSubscription(phoneNumber, telegramId, botId)
    const newTelegramId = 11111111
    const ctx = createMockContext(phoneNumber, newTelegramId)

    await contactMessageHandler(botId)(ctx)

    const subscriber = await TelegramSubscriber.findOne({
      where: { phoneNumber },
    })
    expect(subscriber?.telegramId).toBe(`${newTelegramId}`)

    const botSubscriber = await BotSubscriber.findOne({
      where: { botId, telegramId: newTelegramId },
    })
    expect(botSubscriber).not.toBeNull()

    expect(ctx.reply).toBeCalledWith(
      'You were already subscribed. Your phone number and Telegram ID have been updated.',
      { reply_markup: { remove_keyboard: true } }
    )
  })

  test('Skip update if contact details remain the same', async () => {
    await insertBotSubscription(phoneNumber, telegramId, botId)
    const ctx = createMockContext(phoneNumber, telegramId)

    await contactMessageHandler(botId)(ctx)
    expect(ctx.reply).toBeCalledWith(
      'You were already subscribed. Your phone number and Telegram ID have been updated.',
      {
        reply_markup: { remove_keyboard: true },
      }
    )
  })
})
