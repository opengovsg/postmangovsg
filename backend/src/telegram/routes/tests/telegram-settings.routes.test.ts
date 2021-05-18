import request from 'supertest'
import { Sequelize } from 'sequelize-typescript'
import initialiseServer from '@test-utils/server'
import { Credential, UserCredential, User } from '@core/models'
import sequelizeLoader from '@test-utils/sequelize-loader'
import { RedisService } from '@core/services'
import { ChannelType } from '@core/constants'

const app = initialiseServer(true)
let sequelize: Sequelize

beforeAll(async () => {
  sequelize = await sequelizeLoader(process.env.JEST_WORKER_ID || '1')
  await User.create({ id: 1, email: 'user@agency.gov.sg' })
})

afterAll(async () => {
  await UserCredential.destroy({ where: {} })
  await User.destroy({ where: {} })
  await sequelize.close()
  RedisService.otpClient.quit()
  RedisService.sessionClient.quit()
})

afterEach(async () => {
  jest.clearAllMocks()
})

// Setup spy method (for Mock) getSecretValue that always returns TELEGRAM_SECRET_VALUE
const TELEGRAM_SECRET_VALUE = {
  SecretString: '12345:TEST_TELEGRAM_API_TOKEN',
}
const mockGetSecretValue = jest.fn((_) => TELEGRAM_SECRET_VALUE)
const mockCreateSecret = jest.fn()

// Setup Mock AWS SecretsManager
jest.mock('aws-sdk', () => {
  return {
    ...jest.requireActual('aws-sdk'),
    SecretsManager: function () {
      return {
        getSecretValue: ({ SecretId }: { SecretId: string }) => ({
          promise: () => mockGetSecretValue(SecretId),
        }),
        createSecret: () => ({
          promise: () => mockCreateSecret(),
        }),
      }
    },
  }
})

const mockGetMe = jest.fn()

jest.mock('telegraf', () => {
  return {
    ...jest.requireActual('telegraf'),
    Telegram: function () {
      return {
        getMe: mockGetMe,
        setWebhook: jest.fn().mockResolvedValue(true),
        setMyCommands: jest.fn().mockResolvedValue(true),
      }
    },
  }
})

describe('POST /settings/telegram/credentials', () => {
  test('User should not be able to add custom credential using invalid Telegram API key', async () => {
    const INVALID_API_TOKEN = 'Some Invalid API Token'

    // Mock Telegram API to return 404 error (invalid token)
    const TELEGRAM_ERROR_STRING = '404: Not Found'
    mockGetMe.mockImplementation(() => {
      throw Error(TELEGRAM_ERROR_STRING)
    })

    const res = await request(app).post('/settings/telegram/credentials').send({
      label: 'telegram-credential-1',
      telegram_bot_token: INVALID_API_TOKEN,
    })

    expect(res.status).toBe(400)
    expect(res.body).toEqual({
      message: `Error: Invalid token. ${TELEGRAM_ERROR_STRING}`,
    })

    expect(mockCreateSecret).not.toHaveBeenCalled()
  })

  test('User should be able to add custom credential using valid Telegram API key', async () => {
    const VALID_API_TOKEN = '12345:Some Valid API Token'
    const CREDENTIAL_LABEL = 'telegram-credential-1'

    // Mock Telegram API to return a bot with user id 12345
    mockGetMe.mockResolvedValue({
      id: 12345,
      is_bot: true,
    })

    const res = await request(app).post('/settings/telegram/credentials').send({
      label: CREDENTIAL_LABEL,
      telegram_bot_token: VALID_API_TOKEN,
    })

    expect(res.status).toBe(200)

    expect(mockCreateSecret).toHaveBeenCalled()

    // Ensure credential was added into DB
    const dbCredential = Credential.findOne({
      where: {
        name: '12345',
      },
    })
    expect(dbCredential).not.toBe(null)

    const dbUserCredential = UserCredential.findOne({
      where: {
        label: CREDENTIAL_LABEL,
        type: ChannelType.Telegram,
        credName: '12345',
        userId: 1,
      },
    })
    expect(dbUserCredential).not.toBe(null)
  })
})
