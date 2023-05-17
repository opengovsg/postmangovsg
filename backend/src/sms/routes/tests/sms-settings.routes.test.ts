import request from 'supertest'
import { Sequelize } from 'sequelize-typescript'
import initialiseServer from '@test-utils/server'
import { Credential, UserCredential, User } from '@core/models'
import sequelizeLoader from '@test-utils/sequelize-loader'
import { ChannelType } from '@core/constants'
import { mockSecretsManager } from '@mocks/@aws-sdk/client-secrets-manager'
import { SmsService } from '@sms/services'

const app = initialiseServer(true)
let sequelize: Sequelize

beforeAll(async () => {
  sequelize = await sequelizeLoader(process.env.JEST_WORKER_ID || '1')
  await User.create({ id: 1, email: 'user@agency.gov.sg' } as User)
})

afterAll(async () => {
  await UserCredential.destroy({ where: {} })
  await Credential.destroy({ where: {} })
  await User.destroy({ where: {} })
  await sequelize.close()
  await (app as any).cleanup()
})

describe('POST /settings/sms/credentials', () => {
  afterEach(async () => {
    // Reset number of calls for mocked functions
    jest.clearAllMocks()
  })

  test('User should not be able to add custom credential using invalid Twilio API key', async () => {
    // Mock Twilio API to fail
    const ERROR_MESSAGE = 'Some Error'
    const mockSendValidationMessage = jest
      .spyOn(SmsService, 'sendValidationMessage')
      .mockRejectedValue(new Error(ERROR_MESSAGE))

    const res = await request(app).post('/settings/sms/credentials').send({
      label: 'sms-credential-1',
      recipient: '81234567',
      twilio_account_sid: 'twilio_account_sid',
      twilio_api_key: 'twilio_api_key',
      twilio_api_secret: 'twilio_api_secret',
      twilio_messaging_service_sid: 'twilio_messaging_service_sid',
    })
    expect(res.status).toBe(400)
    expect(res.body).toEqual({
      message: `Error: ${ERROR_MESSAGE}`,
    })

    expect(mockSecretsManager.createSecret).not.toHaveBeenCalled()
    mockSendValidationMessage.mockRestore()
  })

  test('User should be able to add custom credential using valid Twilio API key', async () => {
    const CREDENTIAL_LABEL = 'sms-credential-1'
    const mockSendValidationMessage = jest
      .spyOn(SmsService, 'sendValidationMessage')
      .mockResolvedValue()

    // getEncodedHash is used as the stored name in AWS SecretsManager
    const HASHED_CREDS = 'HASHED_CREDS'
    const mockGetEncodedHash = jest
      .spyOn(SmsService, 'getEncodedHash')
      .mockResolvedValue(HASHED_CREDS)

    const res = await request(app).post('/settings/sms/credentials').send({
      label: CREDENTIAL_LABEL,
      recipient: '81234567',
      twilio_account_sid: 'twilio_account_sid',
      twilio_api_key: 'twilio_api_key',
      twilio_api_secret: 'twilio_api_secret',
      twilio_messaging_service_sid: 'twilio_messaging_service_sid',
    })

    expect(res.status).toBe(200)

    expect(mockSecretsManager.createSecret).toHaveBeenCalledWith(
      expect.objectContaining({
        Name: HASHED_CREDS,
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
        name: HASHED_CREDS,
      },
    })
    expect(dbCredential).not.toBe(null)

    const dbUserCredential = await UserCredential.findOne({
      where: {
        label: CREDENTIAL_LABEL,
        type: ChannelType.SMS,
        credName: HASHED_CREDS,
        userId: 1,
      },
    })
    expect(dbUserCredential).not.toBe(null)
    mockSendValidationMessage.mockRestore()
    mockGetEncodedHash.mockRestore()
  })
})
