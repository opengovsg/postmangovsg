import { NextFunction, Request, Response } from 'express'
import { Sequelize } from 'sequelize-typescript'
import { Campaign, User } from '@core/models'
import sequelizeLoader from '@test-utils/sequelize-loader'
import { RedisService } from '@core/services'
import { ChannelType } from '@core/constants'
import { ProtectedMiddleware } from '../protected.middleware'

let sequelize: Sequelize
let mockRequest: Partial<Request>
let mockResponse: Partial<Response>
const nextFunction: NextFunction = jest.fn()

beforeEach(() => {
  mockRequest = {}
  mockResponse = {
    sendStatus: jest.fn(),
  }
})

beforeAll(async () => {
  sequelize = await sequelizeLoader(process.env.JEST_WORKER_ID || '1')
  await User.create({ id: 1, email: 'user@agency.gov.sg' })
})

afterAll(async () => {
  await Campaign.destroy({ where: {} })
  await User.destroy({ where: {} })
  await sequelize.close()
  RedisService.otpClient.quit()
  RedisService.sessionClient.quit()
})

describe('isProtectedCampaign middleware', () => {
  test('Returns 403 if campaign is not a protected campaign', async () => {
    const campaign = await Campaign.create({
      name: 'campaign-1',
      userId: 1,
      type: ChannelType.Email,
      valid: false,
      protect: false,
    })

    mockRequest = {
      params: { campaignId: String(campaign.id) },
    }

    await ProtectedMiddleware.isProtectedCampaign(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    )
    expect(mockResponse.sendStatus).toBeCalledWith(403)
  })

  test('Returns next middleware when campaign belongs to user', async () => {
    const campaign = await Campaign.create({
      name: 'campaign-1',
      userId: 1,
      type: ChannelType.Email,
      valid: false,
      protect: true,
    })

    mockRequest = {
      params: { campaignId: String(campaign.id) },
      session: { user: { id: 1 } } as any,
    }

    await ProtectedMiddleware.isProtectedCampaign(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    )
    expect(nextFunction).toBeCalled()
  })
})
