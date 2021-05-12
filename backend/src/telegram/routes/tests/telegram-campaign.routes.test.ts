import request from 'supertest'
import { Sequelize } from 'sequelize-typescript'
import initialiseServer from '@test-utils/server'
import { Campaign, User } from '@core/models'
import sequelizeLoader from '@test-utils/sequelize-loader'
import { RedisService } from '@core/services'
import { DefaultCredentialName } from '@core/constants'
import { formatDefaultCredentialName } from '@core/utils'
import { TelegramMessage } from '@telegram/models'
import { ChannelType } from '@core/constants'

const app = initialiseServer(true)
let sequelize: Sequelize

beforeAll(async () => {
  sequelize = await sequelizeLoader(process.env.JEST_WORKER_ID || '1')
  await User.create({ id: 1, email: 'user@agency.gov.sg' })
})

afterAll(async () => {
  await TelegramMessage.destroy({ where: {} })
  await Campaign.destroy({ where: {} })
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
  SecretString: 'TEST_TELEGRAM_API_TOKEN',
}
const mockGetSecretValue = jest.fn((_) => TELEGRAM_SECRET_VALUE)

// Setup Mock AWS SecretsManager
jest.mock('aws-sdk', () => {
  return {
    ...jest.requireActual('aws-sdk'),
    SecretsManager: function () {
      return {
        getSecretValue: ({ SecretId }: { SecretId: string }) => ({
          promise: () => mockGetSecretValue(SecretId),
        }),
      }
    },
  }
})

// Creates demo/non-demo campaign based on parameters
const createCampaign = async ({ isDemo }: { isDemo: boolean }) =>
  await Campaign.create({
    name: 'Test Campaign',
    userId: 1,
    type: ChannelType.Telegram,
    protect: false,
    valid: false,
    demoMessageLimit: isDemo ? 20 : null,
  })

describe('POST /credentials', () => {
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

    // SecretManager should not be called
    expect(mockGetSecretValue).not.toHaveBeenCalled()
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

    // SecretManager should not be called
    expect(mockGetSecretValue).not.toHaveBeenCalled()
  })

  test('Demo Campaign should be able to use demo credentials', async () => {
    const demoCampaign = await createCampaign({ isDemo: true })

    await request(app)
      .post(`/campaign/${demoCampaign.id}/telegram/credentials`)
      .send({
        label: DefaultCredentialName.Telegram,
      })

    // Expect SecretManager to be called with default credentials
    expect(mockGetSecretValue).toHaveBeenCalledWith(
      formatDefaultCredentialName(DefaultCredentialName.Telegram)
    )
  })
})

describe('PUT /campaign/{campaignId}/telegram/template', () => {
  let campaignId: number

  beforeAll(async () => {
    const campaign = await Campaign.create({
      name: 'campaign-1',
      userId: 1,
      type: ChannelType.Telegram,
      valid: false,
    })
    campaignId = campaign.id
  })

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
    })
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
