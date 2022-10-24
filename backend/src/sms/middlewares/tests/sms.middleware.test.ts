import { ChannelType } from '@core/constants'
import { Campaign, User } from '@core/models'
import { InitCredentialService, RedisService } from '@core/services'
import { SmsMiddleware } from '@sms/middlewares/sms.middleware'
import sequelizeLoader from '@test-utils/sequelize-loader'
import { NextFunction, Request, Response } from 'express'
import { Sequelize } from 'sequelize-typescript'

import { InitSmsMiddleware } from '..'

let sequelize: Sequelize
let campaignId: number
let mockRequest: Partial<Request>
let mockResponse: Partial<Response>
const redisService = new RedisService()
let smsMiddleware: SmsMiddleware
const nextFunction: NextFunction = jest.fn()

beforeEach(() => {
  mockRequest = {}
  mockResponse = {
    sendStatus: jest.fn(),
  }
  smsMiddleware = InitSmsMiddleware(InitCredentialService(redisService))
})

beforeAll(async () => {
  sequelize = await sequelizeLoader(process.env.JEST_WORKER_ID || '1')
  await User.create({ id: 1, email: 'user@agency.gov.sg' } as User)
  const campaign = await Campaign.create({
    name: 'campaign-1',
    userId: 1,
    type: ChannelType.SMS,
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

describe('isSmsCampaignOwnedByUser middleware', () => {
  test('Returns 403 campaign does not belong to user', async () => {
    mockRequest = {
      params: { campaignId: String(campaignId) },
      session: { user: { id: 2 } } as any,
    }

    await smsMiddleware.isSmsCampaignOwnedByUser(
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

    await smsMiddleware.isSmsCampaignOwnedByUser(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    )
    expect(nextFunction).toBeCalled()
  })
})
