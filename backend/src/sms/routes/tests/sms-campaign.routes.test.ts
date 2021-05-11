import request from 'supertest'
import { Sequelize } from 'sequelize-typescript'
import initialiseServer from '@test-utils/server'
import { Campaign, User } from '@core/models'
import sequelizeLoader from '@test-utils/sequelize-loader'
import { RedisService } from '@core/services'
import { DefaultCredentialName } from '@core/constants'

const app = initialiseServer(true)
let sequelize: Sequelize

beforeAll(async () => {
  sequelize = await sequelizeLoader(process.env.JEST_WORKER_ID || '1')
  await User.create({ id: 1, email: 'user@agency.gov.sg' })
})

afterAll(async () => {
  await Campaign.destroy({ where: {} })
  await User.destroy({ where: {} })
  await sequelize.close()
  RedisService.otpClient.quit()
  RedisService.sessionClient.quit()
})

// Setup spy method (for Mock) getSecretValue that always returns TWILIO_SECRET_VALUE
const TWILIO_SECRET_VALUE = {
  SecretString: JSON.stringify({
    accountSid: '',
    apiKey: '',
    apiSecret: '',
    messagingServiceSid: '',
  }),
}
const mockGetSecretValue = jest.fn(() => TWILIO_SECRET_VALUE)

// Setup Mock AWS SecretsManager
jest.mock('aws-sdk', () => {
  return {
    ...jest.requireActual('aws-sdk'),
    SecretsManager: function () {
      return {
        getSecretValue: function () {
          return {
            promise: mockGetSecretValue,
          }
        },
      }
    },
  }
})

// Creates demo/non-demo campaign based on parameters
const createCampaign = async ({ isDemo }: { isDemo: boolean }) =>
  await Campaign.create({
    name: 'Test Campaign',
    userId: 1,
    type: 'SMS',
    protect: false,
    valid: false,
    demoMessageLimit: isDemo ? 20 : null,
  })

describe('POST /credentials', () => {
  test('Non-Demo campaign should not be able to use demo credentials', async () => {
    const nonDemoCampaign = await createCampaign({ isDemo: false })

    const res = await request(app)
      .post(`/campaign/${nonDemoCampaign.id}/sms/credentials`)
      .send({
        label: DefaultCredentialName.SMS,
        recipient: '98765432',
      })

    expect(res.status).toBe(400)
    expect(res.body).toEqual({
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

    expect(res.status).toBe(400)
    expect(res.body).toEqual({
      message: `Demo campaign must use demo credentials. ${NON_DEMO_CREDENTIAL_LABEL} is not allowed.`,
    })
  })

  test('Demo Campaign should be able to use demo credentials', async () => {
    const demoCampaign = await createCampaign({ isDemo: true })

    await request(app)
      .post(`/campaign/${demoCampaign.id}/sms/credentials`)
      .send({
        label: DefaultCredentialName.SMS,
        recipient: '98765432',
      })

    // Expect SecretManager to be called
    expect(mockGetSecretValue).toHaveBeenCalled()
  })
})
