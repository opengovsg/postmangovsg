import { NextFunction, Request, Response } from 'express'
import { Sequelize } from 'sequelize-typescript'
import { Readable } from 'stream'
import { Campaign, User } from '@core/models'
import sequelizeLoader from '@test-utils/sequelize-loader'
import { RedisService, UploadService } from '@core/services'
import { ChannelType } from '@core/constants'
import { SmsMessage, SmsTemplate } from '@sms/models'
import { SmsTemplateMiddleware } from '@sms/middlewares'
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
    type: ChannelType.SMS,
    valid: false,
  })
  campaignId = campaign.id
})

afterEach(async () => {
  await SmsTemplate.destroy({ where: {} })
  await SmsMessage.destroy({ where: {} })
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
    await SmsTemplate.create({
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

    await SmsTemplateMiddleware.uploadCompleteHandler(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    )

    const campaign = await Campaign.findOne({ where: { id: campaignId } })
    expect(campaign?.s3Object).toEqual({
      temp_filename: 'abc',
      error:
        "Error: 'recipient' column is missing from the uploaded recipient file. Please check the cell in your uploaded CSV file to ensure the recipient's contact info is correctly labelled as 'recipient'.",
    })

    mockExtractParamsFromJwt.mockRestore()
    s3ClientMock.mockRestore()
  })

  test('Stores filename in s3Object if file is valid', async () => {
    await SmsTemplate.create({
      campaignId: campaignId,
      params: { variable1: 'abc' },
      body: 'test {{name}}',
    })

    const mockExtractParamsFromJwt = jest
      .spyOn(UploadService, 'extractParamsFromJwt')
      .mockReturnValue({ s3Key: 'key' })

    // mock valid recipient file
    const fileStream = Readable.from('recipient,name\n8123,abc')

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

    await SmsTemplateMiddleware.uploadCompleteHandler(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    )

    await new Promise<void>((resolve) =>
      setTimeout(() => {
        resolve()
      }, 1000)
    )

    const campaign = await Campaign.findOne({ where: { id: campaignId } })
    expect(campaign?.s3Object).toEqual({
      bucket: 'postmangovsg-prod-upload',
      filename: 'abc',
      key: 'key',
    })

    const smsMessages = await SmsMessage.findAll({
      where: { id: campaignId },
    })
    expect(smsMessages.length).toEqual(1)
    expect(smsMessages).toEqual([
      expect.objectContaining({
        campaignId,
        params: { name: 'abc', recipient: '8123' },
        recipient: '8123',
      }),
    ])

    mockExtractParamsFromJwt.mockRestore()
    s3ClientMock.mockRestore()
  })
})
