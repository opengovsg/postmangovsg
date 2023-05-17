import request from 'supertest'
import { Sequelize } from 'sequelize-typescript'
import initialiseServer from '@test-utils/server'
import { Campaign, User, Credential } from '@core/models'
import sequelizeLoader from '@test-utils/sequelize-loader'
import { DefaultCredentialName } from '@core/constants'
import { formatDefaultCredentialName } from '@core/utils'
import { UploadService } from '@core/services'
import { TelegramMessage } from '@telegram/models'
import { ChannelType } from '@core/constants'
import { mockSecretsManager } from '@mocks/@aws-sdk/client-secrets-manager'
import { mockTelegram, Telegram } from '@mocks/telegraf'

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
    type: ChannelType.Telegram,
    protect: false,
    valid: false,
    demoMessageLimit: isDemo ? 20 : null,
  } as Campaign)

beforeAll(async () => {
  sequelize = await sequelizeLoader(process.env.JEST_WORKER_ID || '1')
  await User.create({ id: 1, email: 'user@agency.gov.sg' } as User)
  const campaign = await createCampaign({ isDemo: false })
  campaignId = campaign.id
})

afterAll(async () => {
  await TelegramMessage.destroy({ where: {} })
  await Campaign.destroy({ where: {}, force: true })
  await Credential.destroy({ where: {} })
  await User.destroy({ where: {} })
  await sequelize.close()
  await UploadService.destroyUploadQueue()
  await (app as any).cleanup()
})

describe('POST /campaign/{campaignId}/telegram/credentials', () => {
  beforeAll(async () => {
    // Mock telegram to always accept credential
    mockTelegram.setWebhook.mockResolvedValue(true)
    mockTelegram.setMyCommands.mockResolvedValue(true)
    mockTelegram.getMe.mockResolvedValue({ id: 1 })
  })

  afterAll(async () => {
    mockTelegram.setWebhook.mockReset()
    mockTelegram.setMyCommands.mockReset()
    mockTelegram.getMe.mockReset()
  })

  afterEach(async () => {
    // Reset number of calls for mocked functions
    jest.clearAllMocks()
  })

  test('Non-Demo campaign should not be able to use demo credentials', async () => {
    const nonDemoCampaign = await createCampaign({ isDemo: false })

    const res = await request(app)
      .post(`/campaign/${nonDemoCampaign.id}/telegram/credentials`)
      .send({
        label: DefaultCredentialName.Telegram,
      })

    expect(res.status).toBe(400)
    expect(res.body).toEqual({
      message: `Campaign cannot use demo credentials. ${DefaultCredentialName.Telegram} is not allowed.`,
    })

    expect(mockSecretsManager.getSecretValue).not.toHaveBeenCalled()
  })

  test('Demo Campaign should not be able to use non-demo credentials', async () => {
    const demoCampaign = await createCampaign({ isDemo: true })

    const NON_DEMO_CREDENTIAL_LABEL = 'Some Credential'

    const res = await request(app)
      .post(`/campaign/${demoCampaign.id}/telegram/credentials`)
      .send({
        label: NON_DEMO_CREDENTIAL_LABEL,
      })

    expect(res.status).toBe(400)
    expect(res.body).toEqual({
      message: `Demo campaign must use demo credentials. ${NON_DEMO_CREDENTIAL_LABEL} is not allowed.`,
    })

    expect(mockSecretsManager.getSecretValue).not.toHaveBeenCalled()
  })

  test('Demo Campaign should be able to use demo credentials', async () => {
    const demoCampaign = await createCampaign({ isDemo: true })

    const DEFAULT_TELEGRAM_CREDENTIAL = '12345'
    mockSecretsManager.getSecretValue.mockResolvedValue({
      SecretString: DEFAULT_TELEGRAM_CREDENTIAL,
    })

    const res = await request(app)
      .post(`/campaign/${demoCampaign.id}/telegram/credentials`)
      .send({
        label: DefaultCredentialName.Telegram,
      })

    expect(res.status).toBe(200)

    expect(mockSecretsManager.getSecretValue).toHaveBeenCalledWith({
      SecretId: formatDefaultCredentialName(DefaultCredentialName.Telegram),
    })
    expect(Telegram).toHaveBeenCalledWith(DEFAULT_TELEGRAM_CREDENTIAL)

    mockSecretsManager.getSecretValue.mockReset()
  })
})

describe('POST /campaign/{campaignId}/telegram/new-credentials', () => {
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

  test('Demo Campaign should not be able to create custom credential', async () => {
    const demoCampaign = await createCampaign({ isDemo: true })

    const FAKE_API_TOKEN = 'Some API Token'

    const res = await request(app)
      .post(`/campaign/${demoCampaign.id}/telegram/new-credentials`)
      .send({
        telegram_bot_token: FAKE_API_TOKEN,
      })

    expect(res.status).toBe(400)
    expect(res.body).toEqual({
      message: `Action disabled for demo campaign`,
    })

    expect(mockSecretsManager.createSecret).not.toHaveBeenCalled()
  })

  test('User should not be able to add custom credential using invalid Telegram API key', async () => {
    const nonDemoCampaign = await createCampaign({ isDemo: false })

    const INVALID_API_TOKEN = 'Some Invalid API Token'

    // Mock Telegram API to return 404 error (invalid token)
    const TELEGRAM_ERROR_STRING = '404: Not Found'
    mockTelegram.getMe.mockRejectedValue(new Error(TELEGRAM_ERROR_STRING))

    const res = await request(app)
      .post(`/campaign/${nonDemoCampaign.id}/telegram/new-credentials`)
      .send({
        telegram_bot_token: INVALID_API_TOKEN,
      })

    expect(res.status).toBe(400)
    expect(res.body).toEqual({
      message: `Error: Invalid token. ${TELEGRAM_ERROR_STRING}`,
    })

    expect(mockSecretsManager.createSecret).not.toHaveBeenCalled()
    mockTelegram.getMe.mockReset()
  })

  test('User should be able to add custom credential using valid Telegram API key', async () => {
    const nonDemoCampaign = await createCampaign({ isDemo: false })

    const VALID_API_TOKEN = '12345:Some Valid API Token'

    // Mock Telegram API to return a bot with user id 12345
    mockTelegram.getMe.mockResolvedValue({ id: 12345 })

    const res = await request(app)
      .post(`/campaign/${nonDemoCampaign.id}/telegram/new-credentials`)
      .send({
        telegram_bot_token: VALID_API_TOKEN,
      })

    expect(res.status).toBe(200)

    const secretName = `${process.env.APP_ENV}-12345`
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
    mockTelegram.getMe.mockReset()
  })
})

describe('PUT /campaign/{campaignId}/telegram/template', () => {
  test('Template with only invalid HTML tags is not accepted', async () => {
    const testBody = await request(app)
      .put(`/campaign/${campaignId}/telegram/template`)
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
    await TelegramMessage.create({
      campaignId,
      recipient: 'user@agency.gov.sg',
      params: { recipient: 'user@agency.gov.sg' },
    } as TelegramMessage)
    const res = await request(app)
      .put(`/campaign/${campaignId}/telegram/template`)
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

    const telegramMessages = await TelegramMessage.count({
      where: { campaignId },
    })
    expect(telegramMessages).toEqual(0)
  })

  test('Successfully update template', async () => {
    const res = await request(app)
      .put(`/campaign/${campaignId}/telegram/template`)
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
