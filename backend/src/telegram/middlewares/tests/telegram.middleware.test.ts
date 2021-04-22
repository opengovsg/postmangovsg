import { NextFunction, Request, Response } from 'express'
import { Sequelize } from 'sequelize-typescript'
import { Campaign, JobQueue, User } from '@core/models'
import sequelizeLoader from '@test-utils/sequelize-loader'
import { RedisService } from '@core/services'
import { ChannelType, JobStatus } from '@core/constants'
import { TelegramMiddleware } from '@telegram/middlewares/telegram.middleware'

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

afterEach(async () => {
  await JobQueue.destroy({ where: {} })
  await Campaign.destroy({ where: {} })
})

afterAll(async () => {
  await User.destroy({ where: {} })
  await sequelize.close()
  RedisService.otpClient.quit()
  RedisService.sessionClient.quit()
})

describe('isTelegramCampaignOwnedByUser middleware', () => {
  test('Returns 403 campaign does not belong to user', async () => {
    const campaign = await Campaign.create({
      name: 'campaign-1',
      userId: 1,
      type: ChannelType.Telegram,
      valid: false,
      protect: false,
    })
    await JobQueue.create({
      campaignId: campaign.id,
      status: JobStatus.Sending,
    })

    mockRequest = {
      params: { campaignId: String(campaign.id) },
      session: { user: { id: 2 } } as any,
    }

    await TelegramMiddleware.isTelegramCampaignOwnedByUser(
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
      type: ChannelType.Telegram,
      valid: false,
      protect: false,
    })
    await JobQueue.create({
      campaignId: campaign.id,
      status: JobStatus.Sending,
    })

    mockRequest = {
      params: { campaignId: String(campaign.id) },
      session: { user: { id: 1 } } as any,
    }

    await TelegramMiddleware.isTelegramCampaignOwnedByUser(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    )
    expect(nextFunction).toBeCalled()
  })
})
