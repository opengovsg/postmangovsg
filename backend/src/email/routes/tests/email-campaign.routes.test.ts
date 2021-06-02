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
import { EmailFromAddress, EmailMessage, EmailTemplate } from '@email/models'
import { CustomDomainService } from '@email/services'

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

afterEach(async () => {
  await EmailFromAddress.destroy({ where: {} })
  await EmailTemplate.destroy({ where: {} })
})

afterAll(async () => {
  await EmailMessage.destroy({ where: {} })
  await Campaign.destroy({ where: {} })
  await User.destroy({ where: {} })
  await sequelize.close()
  RedisService.otpClient.quit()
  RedisService.sessionClient.quit()
})

describe('PUT /campaign/{campaignId}/email/template', () => {
  test('Invalid from address is not accepted', async () => {
    const res = await request(app)
      .put(`/campaign/${campaignId}/email/template`)
      .send({
        from: 'abc@postman.gov.sg',
        subject: 'test',
        body: 'test',
        reply_to: 'user@agency.gov.sg',
      })
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ message: "Invalid 'from' email address." })
  })

  test('Default from address is used if not provided', async () => {
    const res = await request(app)
      .put(`/campaign/${campaignId}/email/template`)
      .send({
        subject: 'test',
        body: 'test',
        reply_to: 'user@agency.gov.sg',
      })
    expect(res.status).toBe(200)
    expect(res.body).toEqual(
      expect.objectContaining({
        message: `Template for campaign ${campaignId} updated`,
        template: expect.objectContaining({
          from: 'Postman <donotreply@mail.postman.gov.sg>',
          reply_to: 'user@agency.gov.sg',
        }),
      })
    )
  })

  test('Default from address is accepted', async () => {
    const res = await request(app)
      .put(`/campaign/${campaignId}/email/template`)
      .send({
        from: 'Postman <donotreply@mail.postman.gov.sg>',
        subject: 'test',
        body: 'test',
        reply_to: 'user@agency.gov.sg',
      })
    expect(res.status).toBe(200)
    expect(res.body).toEqual(
      expect.objectContaining({
        message: `Template for campaign ${campaignId} updated`,
        template: expect.objectContaining({
          from: 'Postman <donotreply@mail.postman.gov.sg>',
          reply_to: 'user@agency.gov.sg',
        }),
      })
    )
  })

  test("Unverified user's email as from address is not accepted", async () => {
    const res = await request(app)
      .put(`/campaign/${campaignId}/email/template`)
      .send({
        from: 'user@agency.gov.sg',
        subject: 'test',
        body: 'test',
        reply_to: 'user@agency.gov.sg',
      })
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ message: 'From Address has not been verified.' })
  })

  test("Verified user's email as from address is accepted", async () => {
    await EmailFromAddress.create({
      email: 'user@agency.gov.sg',
      name: 'Agency ABC',
    })
    const mockVerifyFromAddress = jest
      .spyOn(CustomDomainService, 'verifyFromAddress')
      .mockReturnValue(Promise.resolve())

    const res = await request(app)
      .put(`/campaign/${campaignId}/email/template`)
      .send({
        from: 'Agency ABC <user@agency.gov.sg>',
        subject: 'test',
        body: 'test',
        reply_to: 'user@agency.gov.sg',
      })
    expect(res.status).toBe(200)
    expect(res.body).toEqual(
      expect.objectContaining({
        message: `Template for campaign ${campaignId} updated`,
        template: expect.objectContaining({
          from: 'Agency ABC <user@agency.gov.sg>',
          reply_to: 'user@agency.gov.sg',
        }),
      })
    )
    mockVerifyFromAddress.mockRestore()
  })

  test('Protected template without protectedlink variables is not accepted', async () => {
    const res = await request(app)
      .put(`/campaign/${protectedCampaignId}/email/template`)
      .send({
        subject: 'test',
        body: 'test',
        reply_to: 'user@agency.gov.sg',
      })
    expect(res.status).toBe(500)
    expect(res.body).toEqual({
      message:
        'Error: There are missing keywords in the message template: protectedlink. Please return to the previous step to add in the keywords.',
    })
  })

  test('Protected template with disallowed variables in subject is not accepted', async () => {
    const testSubject = await request(app)
      .put(`/campaign/${protectedCampaignId}/email/template`)
      .send({
        subject: 'test {{name}}',
        body: '{{recipient}} {{protectedLink}}',
        reply_to: 'user@agency.gov.sg',
      })
    expect(testSubject.status).toBe(500)
    expect(testSubject.body).toEqual({
      message:
        'Error: Only these keywords are allowed in the template: protectedlink,recipient.\nRemove the other keywords from the template: name.',
    })
  })

  test('Protected template with disallowed variables in body is not accepted', async () => {
    const testBody = await request(app)
      .put(`/campaign/${protectedCampaignId}/email/template`)
      .send({
        subject: 'test',
        body: '{{recipient}} {{protectedLink}} {{name}}',
        reply_to: 'user@agency.gov.sg',
      })

    expect(testBody.status).toBe(500)
    expect(testBody.body).toEqual({
      message:
        'Error: Only these keywords are allowed in the template: protectedlink,recipient.\nRemove the other keywords from the template: name.',
    })
  })

  test('Protected template with only allowed variables is accepted', async () => {
    const testBody = await request(app)
      .put(`/campaign/${protectedCampaignId}/email/template`)
      .send({
        subject: 'test {{recipient}} {{protectedLink}}',
        body: 'test {{recipient}} {{protectedLink}}',
        reply_to: 'user@agency.gov.sg',
      })

    expect(testBody.status).toBe(200)
    expect(testBody.body).toEqual(
      expect.objectContaining({
        message: `Template for campaign ${protectedCampaignId} updated`,
        template: expect.objectContaining({
          from: 'Postman <donotreply@mail.postman.gov.sg>',
          reply_to: 'user@agency.gov.sg',
        }),
      })
    )
  })

  test('Template with only invalid HTML tags is not accepted', async () => {
    const testBody = await request(app)
      .put(`/campaign/${campaignId}/email/template`)
      .send({
        subject: 'test',
        body: '<script></script>',
        reply_to: 'user@agency.gov.sg',
      })

    expect(testBody.status).toBe(400)
    expect(testBody.body).toEqual({
      message:
        'Message template is invalid as it only contains invalid HTML tags!',
    })
  })

  test('Existing populated messages are removed when template has new variables', async () => {
    await EmailMessage.create({
      campaignId,
      recipient: 'user@agency.gov.sg',
      params: { recipient: 'user@agency.gov.sg' },
    })
    const testBody = await request(app)
      .put(`/campaign/${campaignId}/email/template`)
      .send({
        subject: 'test',
        body: 'test {{name}}',
        reply_to: 'user@agency.gov.sg',
      })

    expect(testBody.status).toBe(200)
    expect(testBody.body).toEqual(
      expect.objectContaining({
        message:
          'Please re-upload your recipient list as template has changed.',
        template: expect.objectContaining({
          from: 'Postman <donotreply@mail.postman.gov.sg>',
          reply_to: 'user@agency.gov.sg',
        }),
      })
    )

    const emailMessages = await EmailMessage.count({
      where: { campaignId },
    })
    expect(emailMessages).toEqual(0)
  })

  test('Successfully update template', async () => {
    const res = await request(app)
      .put(`/campaign/${campaignId}/email/template`)
      .send({
        subject: 'test',
        body: 'test {{name}}',
        reply_to: 'user@agency.gov.sg',
      })

    expect(res.status).toBe(200)
    expect(res.body).toEqual(
      expect.objectContaining({
        message: `Template for campaign ${campaignId} updated`,
        template: {
          subject: 'test',
          body: 'test {{name}}',
          from: 'Postman <donotreply@mail.postman.gov.sg>',
          reply_to: 'user@agency.gov.sg',
          params: ['name'],
        },
      })
    )
  })
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

  test('Returns status of csv that timed out while processing', async () => {
    const campaign = await Campaign.create({
      name: 'campaign-1',
      userId: 1,
      type: ChannelType.Email,
      valid: false,
      protect: false,
      s3Object: {
        temp_filename: 'file',
      },
    })

    await sequelize.query(
      `UPDATE campaigns SET updated_at = '${new Date(
        Date.now() - 11 * 60 * 1000
      ).toUTCString()}' WHERE id = ${campaignId}`
    )

    const res = await request(app).get(
      `/campaign/${campaign.id}/email/upload/status`
    )

    expect(res.status).toEqual(200)
    expect(res.body).toEqual({
      is_csv_processing: true,
      temp_csv_filename: 'file',
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
