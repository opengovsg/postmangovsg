import { NextFunction, Request, Response } from 'express'
import { Sequelize } from 'sequelize-typescript'
import { Campaign, JobQueue, User } from '@core/models'
import sequelizeLoader from '@test-utils/sequelize-loader'
import { ChannelType, JobStatus } from '@core/constants'
import { CampaignMiddleware } from '@core/middlewares/campaign.middleware'

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
  await User.create({ id: 1, email: 'user@agency.gov.sg' } as User)
})

afterEach(async () => {
  await JobQueue.destroy({ where: {} })
  await Campaign.destroy({ where: {}, force: true })
})

afterAll(async () => {
  await User.destroy({ where: {} })
  await sequelize.close()
})

describe('canEditCampaign middleware', () => {
  test('Should respond with 403 if campaign has a job in progress', async () => {
    const campaign = await Campaign.create({
      name: 'campaign-1',
      userId: 1,
      type: ChannelType.SMS,
      valid: false,
      protect: false,
    } as Campaign)
    await JobQueue.create({
      campaignId: campaign.id,
      status: JobStatus.Sending,
    } as JobQueue)

    mockRequest = {
      params: { campaignId: String(campaign.id) },
    }

    await CampaignMiddleware.canEditCampaign(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    )
    expect(mockResponse.sendStatus).toBeCalledWith(403)
  })

  test('Should respond with 403 if campaign has an upload in progress', async () => {
    const campaign = await Campaign.create({
      name: `campaign-1`,
      userId: 1,
      type: ChannelType.SMS,
      valid: false,
      protect: false,
      s3Object: { temp_filename: 'file' },
    } as Campaign)
    mockRequest = {
      params: { campaignId: String(campaign.id) },
    }

    await CampaignMiddleware.canEditCampaign(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    )
    expect(mockResponse.sendStatus).toBeCalledWith(403)
  })

  test('Returns next middleware if campaign has no job or upload in progress', async () => {
    const campaign = await Campaign.create({
      name: `campaign-1`,
      userId: 1,
      type: ChannelType.SMS,
      valid: false,
      protect: false,
    } as Campaign)

    mockRequest = {
      params: { campaignId: String(campaign.id) },
    }

    await CampaignMiddleware.canEditCampaign(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    )
    expect(nextFunction).toBeCalled()
  })
})
