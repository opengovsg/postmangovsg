import request from 'supertest'

import { Sequelize } from 'sequelize-typescript'
import initialiseServer from '@test-utils/server'
import { Campaign, User } from '@core/models'
import sequelizeLoader from '@test-utils/sequelize-loader'
import { RedisService, UploadService } from '@core/services'
import { ChannelType } from '@core/constants'
import { EmailTemplate } from '@email/models'

const app = initialiseServer(true)
let sequelize: Sequelize
let campaignId: number

beforeAll(async () => {
  sequelize = await sequelizeLoader(process.env.JEST_WORKER_ID || '1')
  await User.create({ id: 1, email: 'user@agency.gov.sg' })
  const campaign = await Campaign.create({
    name: 'campaign-1',
    userId: 1,
    type: ChannelType.Email,
    valid: false,
    protect: false,
  })
  campaignId = campaign.id
})

afterAll(async () => {
  await Campaign.destroy({ where: {} })
  await User.destroy({ where: {} })
  await sequelize.close()
  RedisService.otpClient.quit()
  RedisService.sessionClient.quit()
})

describe('PUT /campaign/{campaignId}/email/upload/start', () => {
  test('Failed to get pre-signed url from S3', async () => {
    const mockGetUploadParameters = jest
      .spyOn(UploadService, 'getUploadParameters')
      .mockRejectedValue({ message: 'hello' })

    const res = await request(app)
      .get(`/campaign/${campaignId}/email/upload/start`)
      .query({
        mime_type: 'text/csv',
        md5: 'md5',
      })

    expect(res.status).toBe(500)
    expect(res.body).toEqual({ message: 'Unable to generate presigned URL' })
    mockGetUploadParameters.mockRestore()
  })

  test('Successfully generate pre-signed url from S3', async () => {
    const mockGetUploadParameters = jest
      .spyOn(UploadService, 'getUploadParameters')
      .mockReturnValue(
        Promise.resolve({ presignedUrl: 'url', signedKey: 'key' })
      )

    const res = await request(app)
      .get(`/campaign/${campaignId}/email/upload/start`)
      .query({
        mime_type: 'text/csv',
        md5: 'md5',
      })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      presigned_url: 'url',
      transaction_id: 'key',
    })
    mockGetUploadParameters.mockRestore()
  })
})

describe('POST /campaign/{id}/email/upload/complete', () => {
  test('Fails to complete upload if invalid transaction id provided', async () => {
    const res = await request(app)
      .post(`/campaign/${campaignId}/email/upload/complete`)
      .send({ transaction_id: '123', filename: 'abc', etag: '123' })

    expect(res.status).toEqual(500)
  })

  test('Fails to complete upload if template is missing', async () => {
    const mockExtractParamsFromJwt = jest
      .spyOn(UploadService, 'extractParamsFromJwt')
      .mockReturnValue({ s3Key: 'key' })

    const res = await request(app)
      .post(`/campaign/${campaignId}/email/upload/complete`)
      .send({ transaction_id: '123', filename: 'abc', etag: '123' })

    expect(res.status).toEqual(500)
    mockExtractParamsFromJwt.mockRestore()
  })

  test('Successfully starts to complete upload', async () => {
    await EmailTemplate.create({
      campaignId: campaignId,
      params: { variable1: 'abc' },
      subject: 'test',
      body: 'test {{variable1}}',
    })

    const mockExtractParamsFromJwt = jest
      .spyOn(UploadService, 'extractParamsFromJwt')
      .mockReturnValue({ s3Key: 'key' })

    const res = await request(app)
      .post(`/campaign/${campaignId}/email/upload/complete`)
      .send({ transaction_id: '123', filename: 'abc', etag: '123' })

    expect(res.status).toEqual(202)
    mockExtractParamsFromJwt.mockRestore()
  })
})
