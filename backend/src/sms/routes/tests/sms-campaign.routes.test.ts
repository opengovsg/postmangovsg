import request from 'supertest'
import { Sequelize } from 'sequelize-typescript'
import initialiseServer from '@test-utils/server'
import { Campaign, User, Credential } from '@core/models'
import sequelizeLoader from '@test-utils/sequelize-loader'
import { UploadService } from '@core/services'
import { DefaultCredentialName } from '@core/constants'
import { formatDefaultCredentialName } from '@core/utils'
import { SmsMessage, SmsTemplate } from '@sms/models'
import { ChannelType } from '@core/constants'
import { mockSecretsManager } from '@mocks/@aws-sdk/client-secrets-manager'
import { SmsService } from '@sms/services'

const app = initialiseServer(true)
let sequelize: Sequelize
let campaignId: number

// Helper function to create demo/non-demo campaign based on parameters
const createCampaign = async ({
  isDemo,
}: {
  isDemo: boolean
}): Promise<Campaign> =>
  await Campaign.create({
    name: 'test-campaign',
    userId: 1,
    type: ChannelType.SMS,
    protect: false,
    valid: false,
    demoMessageLimit: isDemo ? 20 : null,
  } as Campaign)

beforeAll(async () => {
  sequelize = await sequelizeLoader(process.env.JEST_WORKER_ID || '1')
  await User.create({ id: 1, email: 'user@agency.gov.sg' } as User)
  const campaign = await createCampaign({ isDemo: false })
  campaignId = campaign.id
  jest.mock('@aws-sdk/client-secrets-manager')
})

afterEach(async () => {
  await SmsMessage.destroy({ where: {} })
  await SmsTemplate.destroy({ where: {} })
})

afterAll(async () => {
  await SmsMessage.destroy({ where: {} })
  await Campaign.destroy({ where: {}, force: true })
  await User.destroy({ where: {} })
  await sequelize.close()
  await UploadService.destroyUploadQueue()
  await (app as any).cleanup()
})

describe('GET /campaign/{id}/sms', () => {
  test('Get SMS campaign details', async () => {
    const campaign = await Campaign.create({
      name: 'campaign-1',
      userId: 1,
      type: 'SMS',
      valid: false,
      protect: false,
    } as Campaign)
    const { id, name, type } = campaign
    const TEST_TWILIO_CREDENTIALS = {
      accountSid: '',
      apiKey: '',
      apiSecret: '',
      messagingServiceSid: '',
    }
    const mockGetCampaign = jest
      .spyOn(SmsService, 'getTwilioCostPerOutgoingSMSSegmentUSD')
      .mockResolvedValue(0.0395) // exact value unimportant for test to pass
    // needed because demo credentials are extracted from secrets manager to get
    // credentials to call Twilio API for SMS price
    mockSecretsManager.getSecretValue.mockResolvedValue({
      SecretString: JSON.stringify(TEST_TWILIO_CREDENTIALS),
    })
    const res = await request(app).get(`/campaign/${campaign.id}/sms`)
    expect(res.status).toBe(200)
    expect(res.body).toEqual(expect.objectContaining({ id, name, type }))
    mockGetCampaign.mockRestore()
  })
})

describe('POST /campaign/{campaignId}/sms/credentials', () => {
  afterEach(async () => {
    // Reset number of calls for mocked functions
    jest.clearAllMocks()
  })

  test('Non-Demo campaign should not be able to use demo credentials', async () => {
    const nonDemoCampaign = await createCampaign({ isDemo: false })

    const res = await request(app)
      .post(`/campaign/${nonDemoCampaign.id}/sms/credentials`)
      .send({
        label: DefaultCredentialName.SMS,
        recipient: '98765432',
      })

    expect(res.status).toBe(403)
    expect(res.body).toEqual({
      code: 'unauthorized',
      message: `Campaign cannot use demo credentials. ${DefaultCredentialName.SMS} is not allowed.`,
    })
  })

  test('Demo Campaign should not be able to use non-demo credentials', async () => {
    const demoCampaign = await createCampaign({ isDemo: true })

    const NON_DEMO_CREDENTIAL_LABEL = 'Some Credential'

    const res = await request(app)
      .post(`/campaign/${demoCampaign.id}/sms/credentials`)
      .send({
        label: NON_DEMO_CREDENTIAL_LABEL,
        recipient: '98765432',
      })

    expect(res.status).toBe(403)
    expect(res.body).toEqual({
      code: 'unauthorized',
      message: `Demo campaign must use demo credentials. ${NON_DEMO_CREDENTIAL_LABEL} is not allowed.`,
    })

    expect(mockSecretsManager.getSecretValue).not.toHaveBeenCalled()
  })

  test('Demo Campaign should be able to use demo credentials', async () => {
    const demoCampaign = await createCampaign({ isDemo: true })

    const TEST_TWILIO_CREDENTIALS = {
      accountSid: '',
      apiKey: '',
      apiSecret: '',
      messagingServiceSid: '',
    }
    mockSecretsManager.getSecretValue.mockResolvedValue({
      SecretString: JSON.stringify(TEST_TWILIO_CREDENTIALS),
    })

    const mockSendCampaignMessage = jest
      .spyOn(SmsService, 'sendCampaignMessage')
      .mockResolvedValue()

    const res = await request(app)
      .post(`/campaign/${demoCampaign.id}/sms/credentials`)
      .send({
        label: DefaultCredentialName.SMS,
        recipient: '98765432',
      })

    expect(res.status).toBe(200)

    expect(mockSecretsManager.getSecretValue).toHaveBeenCalledWith({
      SecretId: formatDefaultCredentialName(DefaultCredentialName.SMS),
    })

    mockSecretsManager.getSecretValue.mockReset()
    mockSendCampaignMessage.mockRestore()
  })
})

describe('POST /campaign/{campaignId}/sms/new-credentials', () => {
  afterEach(async () => {
    // Reset number of calls for mocked functions
    jest.clearAllMocks()
  })

  test('Demo Campaign should not be able to create custom credential', async () => {
    const demoCampaign = await createCampaign({ isDemo: true })

    const res = await request(app)
      .post(`/campaign/${demoCampaign.id}/sms/new-credentials`)
      .send({
        recipient: '81234567',
        twilio_account_sid: 'twilio_account_sid',
        twilio_api_key: 'twilio_api_key',
        twilio_api_secret: 'twilio_api_secret',
        twilio_messaging_service_sid: 'twilio_messaging_service_sid',
      })

    expect(res.status).toBe(403)
    expect(res.body).toEqual({
      code: 'unauthorized',
      message: `Action not allowed for demo campaign`,
    })

    expect(mockSecretsManager.createSecret).not.toHaveBeenCalled()
  })

  test('User should not be able to add custom credential using invalid Twilio API key', async () => {
    const nonDemoCampaign = await createCampaign({ isDemo: false })

    // Mock Twilio API to fail
    const ERROR_MESSAGE = 'Some Error'
    const mockSendCampaignMessage = jest
      .spyOn(SmsService, 'sendCampaignMessage')
      .mockRejectedValue(new Error(ERROR_MESSAGE))

    const res = await request(app)
      .post(`/campaign/${nonDemoCampaign.id}/sms/new-credentials`)
      .send({
        recipient: '81234567',
        twilio_account_sid: 'twilio_account_sid',
        twilio_api_key: 'twilio_api_key',
        twilio_api_secret: 'twilio_api_secret',
        twilio_messaging_service_sid: 'twilio_messaging_service_sid',
      })

    expect(res.status).toBe(400)
    expect(res.body).toEqual({
      code: 'invalid_credentials',
      message: 'Some Error',
    })

    expect(mockSecretsManager.createSecret).not.toHaveBeenCalled()
    mockSendCampaignMessage.mockRestore()
  })

  test('User should be able to add custom credential using valid Twilio API key', async () => {
    const nonDemoCampaign = await createCampaign({ isDemo: false })

    const mockSendCampaignMessage = jest
      .spyOn(SmsService, 'sendCampaignMessage')
      .mockResolvedValue()

    const EXPECTED_CRED_NAME = 'MOCKED_UUID'

    const res = await request(app)
      .post(`/campaign/${nonDemoCampaign.id}/sms/new-credentials`)
      .send({
        recipient: '81234567',
        twilio_account_sid: 'twilio_account_sid',
        twilio_api_key: 'twilio_api_key',
        twilio_api_secret: 'twilio_api_secret',
        twilio_messaging_service_sid: 'twilio_messaging_service_sid',
      })

    expect(res.status).toBe(200)

    expect(mockSecretsManager.createSecret).toHaveBeenCalledWith(
      expect.objectContaining({
        Name: EXPECTED_CRED_NAME,
        SecretString: JSON.stringify({
          accountSid: 'twilio_account_sid',
          apiKey: 'twilio_api_key',
          apiSecret: 'twilio_api_secret',
          messagingServiceSid: 'twilio_messaging_service_sid',
        }),
      })
    )

    // Ensure credential was added into DB
    const dbCredential = await Credential.findOne({
      where: {
        name: EXPECTED_CRED_NAME,
      },
    })
    expect(dbCredential).not.toBe(null)
    mockSendCampaignMessage.mockRestore()
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
    } as SmsMessage)

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
      code: 'invalid_template',
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
      code: 'invalid_template',
      message:
        'Message template is invalid as it only contains invalid HTML tags!',
    })
  })

  test('Existing populated messages are removed when template has new variables', async () => {
    await SmsMessage.create({
      campaignId,
      recipient: 'user@agency.gov.sg',
      params: { recipient: 'user@agency.gov.sg' },
    } as SmsMessage)
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
      code: 'internal_server',
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
      params: ['variable1'],
      body: 'test {{variable1}}',
    } as SmsTemplate)

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
