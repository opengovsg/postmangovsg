import { NextFunction, Request, Response } from 'express'
import { Sequelize } from 'sequelize-typescript'
import { Readable } from 'stream'
import { Campaign, User } from '@core/models'
import sequelizeLoader from '@test-utils/sequelize-loader'
import { PhoneNumberService, RedisService, UploadService } from '@core/services'
import { ChannelType } from '@core/constants'
import { TelegramMessage, TelegramTemplate } from '@telegram/models'
import { TelegramTemplateMiddleware } from '@telegram/middlewares'
import S3Client from '@core/services/s3-client.class'

let sequelize: Sequelize
let campaignId: number
let mockRequest: Partial<Request>
let mockResponse: Partial<Response>
const nextFunction: NextFunction = jest.fn()
jest.mock('@core/services/s3-client.class.ts')

beforeEach(() => {
  mockRequest = {}
  mockResponse = {
    sendStatus: jest.fn(),
  }
})

beforeAll(async () => {
  sequelize = await sequelizeLoader(process.env.JEST_WORKER_ID || '1')
  await User.create({ id: 1, email: 'user@agency.gov.sg' })
  const campaign = await Campaign.create({
    name: 'campaign-1',
    userId: 1,
    type: ChannelType.Telegram,
    valid: false,
  })
  campaignId = campaign.id
})

afterEach(async () => {
  await TelegramTemplate.destroy({ where: {} })
  await TelegramMessage.destroy({ where: {} })
  await Campaign.update({ s3Object: {} }, { where: { id: campaignId } })
})

afterAll(async () => {
  await Campaign.destroy({ where: {} })
  await User.destroy({ where: {} })
  await sequelize.close()
  RedisService.otpClient.quit()
  RedisService.sessionClient.quit()
})

describe('uploadCompleteHandler middleware', () => {
  test('Stores error message in s3Object if file is invalid', async () => {
    await TelegramTemplate.create({
      campaignId: campaignId,
      params: { variable1: 'abc' },
      body: 'test {{variable1}}',
    })

    const mockExtractParamsFromJwt = jest
      .spyOn(UploadService, 'extractParamsFromJwt')
      .mockReturnValue({ s3Key: 'key' })

    // mock invalid recipient file
    const fileStream = Readable.from('name\nabc')

    const s3ClientMock = (S3Client as jest.Mock).mockImplementation(() => {
      return {
        download: (): NodeJS.ReadableStream => fileStream,
      }
    })

    mockRequest = {
      session: { user: { id: 1 } } as any,
      params: { campaignId: String(campaignId) },
      body: { transaction_id: '123', filename: 'abc', etag: '123' },
    }

    await TelegramTemplateMiddleware.uploadCompleteHandler(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    )

    const campaign = await Campaign.findOne({ where: { id: campaignId } })
    console.log(campaign?.s3Object)
    expect(campaign?.s3Object).toEqual({
      temp_filename: 'abc',
      error:
        "Error: 'recipient' column is missing from the uploaded recipient file. Please check the cell in your uploaded CSV file to ensure the recipient's contact info is correctly labelled as 'recipient'.",
    })

    mockExtractParamsFromJwt.mockRestore()
    s3ClientMock.mockRestore()
  })

  test('Stores filename in s3Object if file is valid', async () => {
    await TelegramTemplate.create({
      campaignId: campaignId,
      params: { variable1: 'abc' },
      body: 'test {{name}}',
    })

    const mockExtractParamsFromJwt = jest
      .spyOn(UploadService, 'extractParamsFromJwt')
      .mockReturnValue({ s3Key: 'key' })

    const mockNormalisePhoneNumber = jest
      .spyOn(PhoneNumberService, 'normalisePhoneNumber')
      .mockReturnValue('81234567')

    // mock valid recipient file
    const fileStream = Readable.from('recipient,name\n81234567,abc')

    const s3ClientMock = (S3Client as jest.Mock).mockImplementation(() => {
      return {
        download: (): NodeJS.ReadableStream => fileStream,
      }
    })

    mockRequest = {
      session: { user: { id: 1 } } as any,
      params: { campaignId: String(campaignId) },
      body: { transaction_id: '123', filename: 'abc', etag: '123' },
    }

    await TelegramTemplateMiddleware.uploadCompleteHandler(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    )

    const campaign = await Campaign.findOne({ where: { id: campaignId } })
    expect(campaign?.s3Object).toEqual({
      bucket: 'postmangovsg-prod-upload',
      filename: 'abc',
      key: 'key',
    })

    const telegramMessages = await TelegramMessage.findAll({
      where: { id: campaignId },
    })
    expect(telegramMessages.length).toEqual(1)
    expect(telegramMessages).toEqual([
      expect.objectContaining({
        campaignId,
        params: { name: 'abc', recipient: '81234567' },
        recipient: '81234567',
      }),
    ])

    mockExtractParamsFromJwt.mockRestore()
    mockNormalisePhoneNumber.mockRestore()
    s3ClientMock.mockRestore()
  })
})
