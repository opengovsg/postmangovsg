import request from 'supertest'
import { Sequelize } from 'sequelize-typescript'
import initialiseServer from '@test-utils/server'
import { Credential, UserCredential, User } from '@core/models'
import sequelizeLoader from '@test-utils/sequelize-loader'
import { ChannelType } from '@core/constants'
import { mockTelegram } from '@mocks/telegraf'
import { mockSecretsManager } from '@mocks/@aws-sdk/client-secrets-manager'

const app = initialiseServer(true)
let sequelize: Sequelize

beforeAll(async () => {
  sequelize = await sequelizeLoader(process.env.JEST_WORKER_ID || '1')
  await User.create({ id: 1, email: 'user@agency.gov.sg' } as User)
})

afterAll(async () => {
  await UserCredential.destroy({ where: {} })
  await User.destroy({ where: {} })
  await sequelize.close()
  await (app as any).cleanup()
})

describe('POST /settings/telegram/credentials', () => {
  beforeAll(async () => {
    // Mock telegram to always accept credential
    mockTelegram.setWebhook.mockResolvedValue(true)
    mockTelegram.setMyCommands.mockResolvedValue(true)
  })

  afterAll(async () => {
    mockTelegram.setWebhook.mockReset()
    mockTelegram.setMyCommands.mockReset()
  })

  afterEach(async () => {
    // Reset number of calls for mocked functions
    jest.clearAllMocks()
  })

  test('User should not be able to add custom credential using invalid Telegram API key', async () => {
    const INVALID_API_TOKEN = 'Some Invalid API Token'

    // Mock Telegram API to return 404 error (invalid token)
    const TELEGRAM_ERROR_STRING = '404: Not Found'
    mockTelegram.getMe.mockRejectedValue(new Error(TELEGRAM_ERROR_STRING))

    const res = await request(app).post('/settings/telegram/credentials').send({
      label: 'telegram-credential-1',
      telegram_bot_token: INVALID_API_TOKEN,
    })

    expect(res.status).toBe(400)
    expect(res.body).toEqual({
      code: 'invalid_credentials',
      message: `Invalid token. ${TELEGRAM_ERROR_STRING}`,
    })

    expect(mockSecretsManager.createSecret).not.toHaveBeenCalled()
    mockTelegram.getMe.mockReset()
  })

  test('User should be able to add custom credential using valid Telegram API key', async () => {
    const VALID_API_TOKEN = '12345:Some Valid API Token'
    const CREDENTIAL_LABEL = 'telegram-credential-1'

    // Mock Telegram API to return a bot with user id 12345
    mockTelegram.getMe.mockResolvedValue({ id: 12345 })

    const res = await request(app).post('/settings/telegram/credentials').send({
      label: CREDENTIAL_LABEL,
      telegram_bot_token: VALID_API_TOKEN,
    })

    expect(res.status).toBe(200)

    const secretName = 'MOCKED_UUID'
    expect(mockSecretsManager.createSecret).toHaveBeenCalledWith(
      expect.objectContaining({
        Name: secretName,
        SecretString: VALID_API_TOKEN,
      })
    )

    // Ensure credential was added into DB
    const dbCredential = await Credential.findOne({
      where: {
        name: secretName,
      },
    })
    expect(dbCredential).not.toBe(null)

    const dbUserCredential = await UserCredential.findOne({
      where: {
        label: CREDENTIAL_LABEL,
        type: ChannelType.Telegram,
        credName: secretName,
        userId: 1,
      },
    })
    expect(dbUserCredential).not.toBe(null)
    mockTelegram.getMe.mockReset()
  })
})
