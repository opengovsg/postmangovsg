import request from 'supertest'
import { Sequelize } from 'sequelize-typescript'
import initialiseServer from '@test-utils/server'
import { Campaign, User, Statistic } from '@core/models'
import sequelizeLoader from '@test-utils/sequelize-loader'
import { RedisService, UploadService } from '@core/services'
import { ChannelType } from '@core/constants'
import { SmsMessage, SmsTemplate } from '@sms/models'

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
  })
  campaignId = campaign.id
})

afterEach(async () => {
  await SmsTemplate.destroy({ where: {} })
})

afterAll(async () => {
  await SmsMessage.destroy({ where: {} })
  await Campaign.destroy({ where: {} })
  await User.destroy({ where: {} })
  await sequelize.close()
  RedisService.otpClient.quit()
  RedisService.sessionClient.quit()
})

describe('PUT /campaign/{campaignId}/sms/template', () => {
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

describe('GET /campaign/{campaignId}/sms/upload/start', () => {
  test('Failed to get pre-signed url from S3', async () => {
    const mockGetUploadParameters = jest
      .spyOn(UploadService, 'getUploadParameters')
      .mockRejectedValue({ message: 'hello' })

    const res = await request(app)
      .get(`/campaign/${campaignId}/sms/upload/start`)
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
      .get(`/campaign/${campaignId}/sms/upload/start`)
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
      subject: 'test',
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

describe('GET /campaign/{id}/sms/upload/status', () => {
  test('Returns status of csv which is processing', async () => {
    const campaign = await Campaign.create({
      name: 'campaign-1',
      userId: 1,
      type: ChannelType.SMS,
      valid: false,
      s3Object: { temp_filename: 'file' },
    })

    const res = await request(app).get(
      `/campaign/${campaign.id}/sms/upload/status`
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
      type: ChannelType.SMS,
      valid: false,

      s3Object: {
        temp_filename: 'file',
        error: 'error',
      },
    })

    const res = await request(app).get(
      `/campaign/${campaign.id}/sms/upload/status`
    )

    expect(res.status).toEqual(200)
    expect(res.body).toEqual({
      is_csv_processing: false,
      temp_csv_filename: 'file',
      csv_error: 'error',
      num_recipients: 0,
      preview: null,
    })
  })

  test('Returns status of csv which has completed processing successfully', async () => {
    const campaign = await Campaign.create({
      name: 'campaign-1',
      userId: 1,
      type: ChannelType.SMS,
      valid: false,
      s3Object: {
        filename: 'file',
      },
    })

    await Statistic.create({ campaignId: campaign.id, unsent: 20 })

    const res = await request(app).get(
      `/campaign/${campaign.id}/sms/upload/status`
    )

    expect(res.status).toEqual(200)
    expect(res.body).toEqual({
      is_csv_processing: false,
      csv_filename: 'file',
      num_recipients: 20,
      preview: null,
    })
  })
})

describe('DELETE /campaign/{id}/sms/upload/status', () => {
  test('Deletes status of csv which has completed processing with error', async () => {
    const campaign = await Campaign.create({
      name: 'campaign-1',
      userId: 1,
      type: ChannelType.SMS,
      valid: false,

      s3Object: { temp_filename: 'file', error: 'error' },
    })

    const res = await request(app).delete(
      `/campaign/${campaign.id}/sms/upload/status`
    )

    expect(res.status).toEqual(200)
    expect(res.body).toEqual({})
  })
})
