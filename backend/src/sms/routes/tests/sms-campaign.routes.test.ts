import request from 'supertest'
import { Sequelize } from 'sequelize-typescript'
import initialiseServer from '@test-utils/server'
import { Campaign, User } from '@core/models'
import sequelizeLoader from '@test-utils/sequelize-loader'
import { RedisService, UploadService } from '@core/services'
import { SmsMessage, SmsTemplate } from '@sms/models'
import { ChannelType } from '@core/constants'

const app = initialiseServer(true)
let sequelize: Sequelize
let campaignId: number

beforeAll(async () => {
  sequelize = await sequelizeLoader(process.env.JEST_WORKER_ID || '1')
  await User.create({ id: 1, email: 'user@agency.gov.sg' })
  const campaign = await Campaign.create({
    name: 'campaign-1',
    userId: 1,
    type: ChannelType.SMS,
    valid: false,
    protect: false,
  })
  campaignId = campaign.id
})

afterEach(async () => {
  await SmsMessage.destroy({ where: {} })
  await SmsTemplate.destroy({ where: {} })
})

afterAll(async () => {
  await SmsMessage.destroy({ where: {} })
  await Campaign.destroy({ where: {} })
  await User.destroy({ where: {} })
  await sequelize.close()
  await UploadService.destroyUploadQueue()
  RedisService.otpClient.quit()
  RedisService.sessionClient.quit()
})

describe('GET /campaign/{id}/sms', () => {
  test('Get SMS campaign details', async () => {
    const campaign = await Campaign.create({
      name: 'campaign-1',
      userId: 1,
      type: 'SMS',
      valid: false,
      protect: false,
    })
    const { id, name, type } = campaign

    const res = await request(app).get(`/campaign/${campaign.id}/sms`)
    expect(res.status).toBe(200)
    expect(res.body).toEqual(expect.objectContaining({ id, name, type }))
  })
})

describe('PUT /campaign/{id}/sms/template', () => {
  test('Successfully update template for SMS campaign', async () => {
    const res = await request(app)
      .put(`/campaign/${campaignId}/sms/template`)
      .query({ campaignId: campaignId })
      .send({
        body: 'test {{variable}}',
      })
    expect(res.status).toBe(200)
    expect(res.body).toEqual(
      expect.objectContaining({
        message: `Template for campaign ${campaignId} updated`,
        num_recipients: 0,
        template: {
          body: 'test {{variable}}',
          params: ['variable'],
        },
      })
    )
  })

  test('Receive message to re-upload recipient when template has changed', async () => {
    await request(app)
      .put(`/campaign/${campaignId}/sms/template`)
      .query({ campaignId: campaignId })
      .send({
        body: 'test {{variable1}}',
      })
      .expect(200)

    await SmsMessage.create({
      campaignId: campaignId,
      params: { variable1: 'abc' },
    })

    const res = await request(app)
      .put(`/campaign/${campaignId}/sms/template`)
      .query({ campaignId: campaignId })
      .send({
        body: 'test {{variable2}}',
      })
    expect(res.status).toBe(200)
    expect(res.body).toEqual(
      expect.objectContaining({
        message:
          'Please re-upload your recipient list as template has changed.',
        extra_keys: ['variable2'],
        num_recipients: 0,
        template: {
          body: 'test {{variable2}}',
          params: ['variable2'],
        },
      })
    )
  })

  test('Fail to update template for SMS campaign', async () => {
    const res = await request(app)
      .put(`/campaign/${campaignId}/sms/template`)
      .query({ campaignId: campaignId })
      .send({
        body: '<p></p>',
      })
    expect(res.status).toBe(400)
    expect(res.body).toEqual({
      message:
        'Message template is invalid as it only contains invalid HTML tags!',
    })
  })

  test('Template with only invalid HTML tags is not accepted', async () => {
    const testBody = await request(app)
      .put(`/campaign/${campaignId}/sms/template`)
      .send({
        body: '<img></img>',
      })

    expect(testBody.status).toBe(400)
    expect(testBody.body).toEqual({
      message:
        'Message template is invalid as it only contains invalid HTML tags!',
    })
  })

  test('Existing populated messages are removed when template has new variables', async () => {
    await SmsMessage.create({
      campaignId,
      recipient: 'user@agency.gov.sg',
      params: { recipient: 'user@agency.gov.sg' },
    })
    const res = await request(app)
      .put(`/campaign/${campaignId}/sms/template`)
      .send({
        body: 'test {{name}}',
      })

    expect(res.status).toBe(200)
    expect(res.body).toEqual(
      expect.objectContaining({
        message:
          'Please re-upload your recipient list as template has changed.',
        template: expect.objectContaining({
          params: ['name'],
        }),
      })
    )

    const smsMessages = await SmsMessage.count({
      where: { campaignId },
    })
    expect(smsMessages).toEqual(0)
  })

  test('Successfully update template', async () => {
    const res = await request(app)
      .put(`/campaign/${campaignId}/sms/template`)
      .send({
        body: 'test {{name}}',
      })

    expect(res.status).toBe(200)
    expect(res.body).toEqual(
      expect.objectContaining({
        message: `Template for campaign ${campaignId} updated`,
        template: { body: 'test {{name}}', params: ['name'] },
      })
    )
  })
})

describe('GET /campaign/{id}/sms/upload/start', () => {
  test('Fail to generate presigned URL when invalid md5 provided', async () => {
    const mockGetUploadParameters = jest
      .spyOn(UploadService, 'getUploadParameters')
      .mockRejectedValue({ message: 'hello' })

    const res = await request(app)
      .get(`/campaign/${campaignId}/sms/upload/start`)
      .query({
        mime_type: 'text/csv',
        md5: 'invalid md5 checksum',
      })

    expect(res.status).toBe(500)
    expect(res.body).toEqual({
      message: 'Unable to generate presigned URL',
    })
    mockGetUploadParameters.mockRestore()
  })

  test('Successfully generate presigned URL for valid md5', async () => {
    const mockGetUploadParameters = jest
      .spyOn(UploadService, 'getUploadParameters')
      .mockReturnValue(
        Promise.resolve({ presignedUrl: 'url', signedKey: 'key' })
      )

    const res = await request(app)
      .get(`/campaign/${campaignId}/sms/upload/start`)
      .query({
        mime_type: 'text/csv',
        md5: 'valid md5 checksum',
      })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ presigned_url: 'url', transaction_id: 'key' })
    mockGetUploadParameters.mockRestore()
  })
})

describe('POST /campaign/{id}/sms/upload/complete', () => {
  test('Fails to complete upload if invalid transaction id provided', async () => {
    const res = await request(app)
      .post(`/campaign/${campaignId}/sms/upload/complete`)
      .send({ transaction_id: '123', filename: 'abc', etag: '123' })

    expect(res.status).toEqual(500)
  })

  test('Fails to complete upload if template is missing', async () => {
    const mockExtractParamsFromJwt = jest
      .spyOn(UploadService, 'extractParamsFromJwt')
      .mockReturnValue({ s3Key: 'key' })

    const res = await request(app)
      .post(`/campaign/${campaignId}/sms/upload/complete`)
      .send({ transaction_id: '123', filename: 'abc', etag: '123' })

    expect(res.status).toEqual(500)
    mockExtractParamsFromJwt.mockRestore()
  })

  test('Successfully starts recipient list processing', async () => {
    await SmsTemplate.create({
      campaignId: campaignId,
      params: { variable1: 'abc' },
      body: 'test {{variable1}}',
    })

    const mockExtractParamsFromJwt = jest
      .spyOn(UploadService, 'extractParamsFromJwt')
      .mockReturnValue({ s3Key: 'key' })

    const res = await request(app)
      .post(`/campaign/${campaignId}/sms/upload/complete`)
      .send({ transaction_id: '123', filename: 'abc', etag: '123' })

    expect(res.status).toEqual(202)
    mockExtractParamsFromJwt.mockRestore()
  })
})
