import { NextFunction, Request, Response } from 'express'
import { Sequelize } from 'sequelize-typescript'
import { Campaign, User } from '@core/models'
import sequelizeLoader from '@test-utils/sequelize-loader'
import { InitCredentialService, RedisService } from '@core/services'
import { ChannelType } from '@core/constants'
import { TelegramMiddleware } from '@telegram/middlewares/telegram.middleware'
import { InitTelegramMiddleware } from '..'

let sequelize: Sequelize
let campaignId: number
let mockRequest: Partial<Request>
let mockResponse: Partial<Response>
const redisService = new RedisService()
let telegramMiddleware: TelegramMiddleware
const nextFunction: NextFunction = jest.fn()

beforeEach(() => {
  mockRequest = {}
  mockResponse = {
    sendStatus: jest.fn(),
  }
  telegramMiddleware = InitTelegramMiddleware(
    InitCredentialService(redisService)
  )
})

beforeAll(async () => {
  sequelize = await sequelizeLoader(process.env.JEST_WORKER_ID || '1')
  await User.create({ id: 1, email: 'user@agency.gov.sg' } as User)
  const campaign = await Campaign.create({
    name: 'campaign-1',
    userId: 1,
    type: ChannelType.Telegram,
    valid: false,
    protect: false,
  } as Campaign)
  campaignId = campaign.id
})

afterAll(async () => {
  await Campaign.destroy({ where: {}, force: true })
  await User.destroy({ where: {} })
  await sequelize.close()
  await redisService.shutdown()
})

describe('isTelegramCampaignOwnedByUser middleware', () => {
  test('Returns 403 campaign does not belong to user', async () => {
    mockRequest = {
      params: { campaignId: String(campaignId) },
      session: { user: { id: 2 } } as any,
    }

    await telegramMiddleware.isTelegramCampaignOwnedByUser(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    )
    expect(mockResponse.sendStatus).toBeCalledWith(403)
  })

  test('Returns next middleware when campaign belongs to user', async () => {
    mockRequest = {
      params: { campaignId: String(campaignId) },
      session: { user: { id: 1 } } as any,
    }

    await telegramMiddleware.isTelegramCampaignOwnedByUser(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    )
    expect(nextFunction).toBeCalled()
  })
})
