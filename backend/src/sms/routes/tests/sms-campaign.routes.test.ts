import request from 'supertest'
import { Sequelize } from 'sequelize-typescript'
import initialiseServer from '@test-utils/server'
import { Campaign, User } from '@core/models'
import sequelizeLoader from '@test-utils/sequelize-loader'
import { CredentialService, RedisService } from '@core/services'
import { DefaultCredentialName } from '@core/constants'
import { formatDefaultCredentialName } from '@core/utils'
import { SmsMessage } from '@sms/models'
import { ChannelType } from '@core/constants'

const app = initialiseServer(true)
let sequelize: Sequelize

beforeAll(async () => {
  sequelize = await sequelizeLoader(process.env.JEST_WORKER_ID || '1')
  await User.create({ id: 1, email: 'user@agency.gov.sg' })
})

afterAll(async () => {
  await SmsMessage.destroy({ where: {} })
  await Campaign.destroy({ where: {} })
  await User.destroy({ where: {} })
  await sequelize.close()
  RedisService.otpClient.quit()
  RedisService.sessionClient.quit()
})

// Creates demo/non-demo campaign based on parameters
const createCampaign = async ({
  isDemo,
}: {
  isDemo: boolean
}): Promise<Campaign> =>
  await Campaign.create({
    name: 'Test Campaign',
    userId: 1,
    type: ChannelType.SMS,
    protect: false,
    valid: false,
    demoMessageLimit: isDemo ? 20 : null,
  })

describe('POST /campaign/{campaignId}/sms/credentials', () => {
  afterEach(async () => {
    jest.restoreAllMocks()
  })

  test('Non-Demo campaign should not be able to use demo credentials', async () => {
    const nonDemoCampaign = await createCampaign({ isDemo: false })

    const mockGetTwilioCredentials = jest.spyOn(
      CredentialService,
      'getTwilioCredentials'
    )

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

    // CredentialService should not be called
    expect(mockGetTwilioCredentials).not.toHaveBeenCalled()
  })

  test('Demo Campaign should not be able to use non-demo credentials', async () => {
    const demoCampaign = await createCampaign({ isDemo: true })

    const mockGetTwilioCredentials = jest.spyOn(
      CredentialService,
      'getTwilioCredentials'
    )

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

    // CredentialService should not be called
    expect(mockGetTwilioCredentials).not.toHaveBeenCalled()
  })

  test('Demo Campaign should be able to use demo credentials', async () => {
    const demoCampaign = await createCampaign({ isDemo: true })

    const TEST_TWILIO_CREDENTIALS = {
      accountSid: '',
      apiKey: '',
      apiSecret: '',
      messagingServiceSid: '',
    }
    const mockGetTwilioCredentials = jest
      .spyOn(CredentialService, 'getTwilioCredentials')
      .mockResolvedValue(TEST_TWILIO_CREDENTIALS)

    await request(app)
      .post(`/campaign/${demoCampaign.id}/sms/credentials`)
      .send({
        label: DefaultCredentialName.SMS,
        recipient: '98765432',
      })

    // Expect CredentialService to be called with default credentials
    expect(mockGetTwilioCredentials).toHaveBeenCalledWith(
      formatDefaultCredentialName(DefaultCredentialName.SMS)
    )
  })
})

describe('PUT /campaign/{campaignId}/sms/template', () => {
  let campaignId: number

  beforeAll(async () => {
    const campaign = await Campaign.create({
      name: 'campaign-1',
      userId: 1,
      type: ChannelType.SMS,
      valid: false,
    })
    campaignId = campaign.id
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
