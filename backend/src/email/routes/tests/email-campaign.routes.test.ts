import request from 'supertest'

import { Sequelize } from 'sequelize-typescript'
import initialiseServer from '@test-utils/server'
import { Campaign, Statistic, User } from '@core/models'
import sequelizeLoader from '@test-utils/sequelize-loader'
import {
  MultipartUploadService,
  RedisService,
  UploadService,
} from '@core/services'
import { ChannelType } from '@core/constants'
import { EmailTemplate } from '@email/models'

const app = initialiseServer(true)
let sequelize: Sequelize
let campaignId: number
let protectedCampaignId: number

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
  const protectedCampaign = await Campaign.create({
    name: 'campaign-2',
    userId: 1,
    type: ChannelType.Email,
    valid: false,
    protect: true,
  })
  protectedCampaignId = protectedCampaign.id
})

afterAll(async () => {
  await Campaign.destroy({ where: {} })
  await User.destroy({ where: {} })
  await sequelize.close()
  RedisService.otpClient.quit()
  RedisService.sessionClient.quit()
})

describe('GET /campaign/{campaignId}/email/upload/start', () => {
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

  test('Successfully starts recipient list processing', async () => {
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

describe('GET /campaign/{id}/email/upload/status', () => {
  test('Returns status of csv which is processing', async () => {
    const campaign = await Campaign.create({
      name: 'campaign-1',
      userId: 1,
      type: ChannelType.Email,
      valid: false,
      protect: false,
      s3Object: { temp_filename: 'file' },
    })

    const res = await request(app).get(
      `/campaign/${campaign.id}/email/upload/status`
    )

    expect(res.status).toEqual(200)
    expect(res.body).toEqual({
      is_csv_processing: true,
      temp_csv_filename: 'file',
    })
  })

  test('Returns status of csv which has completed processing with error', async () => {
    const campaign = await Campaign.create({
      name: 'campaign-1',
      userId: 1,
      type: ChannelType.Email,
      valid: false,
      protect: false,
      s3Object: {
        temp_filename: 'file',
        error: 'error',
      },
    })

    const res = await request(app).get(
      `/campaign/${campaign.id}/email/upload/status`
    )

    expect(res.status).toEqual(200)
    expect(res.body).toEqual({
      is_csv_processing: false,
      temp_csv_filename: 'file',
      csv_error: 'error',
      num_recipients: 0,
    })
  })

  test('Returns status of csv which has completed processing successfully', async () => {
    const campaign = await Campaign.create({
      name: 'campaign-1',
      userId: 1,
      type: ChannelType.Email,
      valid: false,
      protect: false,
      s3Object: {
        filename: 'file',
      },
    })

    await Statistic.create({ campaignId: campaign.id, unsent: 20 })

    const res = await request(app).get(
      `/campaign/${campaign.id}/email/upload/status`
    )

    expect(res.status).toEqual(200)
    expect(res.body).toEqual({
      is_csv_processing: false,
      csv_filename: 'file',
      num_recipients: 20,
    })
  })
})

describe('DELETE /campaign/{id}/email/upload/status', () => {
  test('Deletes status of csv which has completed processing with error', async () => {
    const campaign = await Campaign.create({
      name: 'campaign-1',
      userId: 1,
      type: ChannelType.Email,
      valid: false,
      protect: false,
      s3Object: { temp_filename: 'file', error: 'error' },
    })

    const res = await request(app).delete(
      `/campaign/${campaign.id}/email/upload/status`
    )

    expect(res.status).toEqual(200)
    expect(res.body).toEqual({})
  })
})

describe('GET /campaign/{campaignId}/email/protet/upload/start', () => {
  test('Failed to get multipart pre-signed url from S3', async () => {
    const mockStartMultipartUpload = jest
      .spyOn(MultipartUploadService, 'startMultipartUpload')
      .mockRejectedValue({ message: 'No upload id' })

    const res = await request(app)
      .get(`/campaign/${protectedCampaignId}/email/protect/upload/start`)
      .query({
        mime_type: 'text/csv',
        part_count: 5,
      })

    expect(res.status).toBe(500)
    mockStartMultipartUpload.mockRestore()
  })

  test('Successfully start multipart upload', async () => {
    const mockStartMultipartUpload = jest
      .spyOn(MultipartUploadService, 'startMultipartUpload')
      .mockReturnValue(
        Promise.resolve({
          transactionId: '123',
          presignedUrls: ['url1', 'url2'],
        })
      )

    const res = await request(app)
      .get(`/campaign/${protectedCampaignId}/email/protect/upload/start`)
      .query({
        mime_type: 'text/csv',
        part_count: 2,
      })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      presigned_urls: ['url1', 'url2'],
      transaction_id: '123',
    })
    mockStartMultipartUpload.mockRestore()
  })
})

describe('POST /campaign/{id}/email/protect/upload/complete', () => {
  test('Fails to complete upload if invalid transaction id provided', async () => {
    const mockCompleteMultipartUpload = jest
      .spyOn(MultipartUploadService, 'completeMultipartUpload')
      .mockRejectedValue('Error')

    const res = await request(app)
      .post(`/campaign/${protectedCampaignId}/email/protect/upload/complete`)
      .send({
        transaction_id: '123',
        filename: 'abc',
        part_count: 2,
        etags: ['123', '345'],
      })

    expect(res.status).toEqual(500)
    mockCompleteMultipartUpload.mockRestore()
  })

  test('Fails to complete upload if template is missing', async () => {
    const mockCompleteMultipartUpload = jest
      .spyOn(MultipartUploadService, 'completeMultipartUpload')
      .mockReturnValue(Promise.resolve({ s3Key: 'key', etag: '123' }))
    const mockExtractParamsFromJwt = jest
      .spyOn(UploadService, 'extractParamsFromJwt')
      .mockReturnValue({ s3Key: 'key' })

    const res = await request(app)
      .post(`/campaign/${protectedCampaignId}/email/protect/upload/complete`)
      .send({
        transaction_id: '123',
        filename: 'abc',
        part_count: 2,
        etags: ['123', '345'],
      })

    expect(res.status).toEqual(500)
    mockCompleteMultipartUpload.mockRestore()
    mockExtractParamsFromJwt.mockRestore()
  })

  test('Successfully starts recipient list processing', async () => {
    await EmailTemplate.create({
      campaignId: protectedCampaignId,
      params: { variable1: 'abc' },
      subject: 'test',
      body: 'test {{protectedlink}}',
    })

    const mockCompleteMultipartUpload = jest
      .spyOn(MultipartUploadService, 'completeMultipartUpload')
      .mockReturnValue(Promise.resolve({ s3Key: 'key', etag: '123' }))
    const mockExtractParamsFromJwt = jest
      .spyOn(UploadService, 'extractParamsFromJwt')
      .mockReturnValue({ s3Key: 'key' })

    const res = await request(app)
      .post(`/campaign/${protectedCampaignId}/email/protect/upload/complete`)
      .send({
        transaction_id: '123',
        filename: 'abc',
        part_count: 2,
        etags: ['123', '345'],
      })

    expect(res.status).toEqual(202)
    mockCompleteMultipartUpload.mockRestore()
    mockExtractParamsFromJwt.mockRestore()
  })
})
