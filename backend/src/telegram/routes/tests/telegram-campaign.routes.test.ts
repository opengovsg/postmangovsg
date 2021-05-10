import request from 'supertest'
import { Sequelize } from 'sequelize-typescript'
import initialiseServer from '@test-utils/server'
import { Campaign, User } from '@core/models'
import sequelizeLoader from '@test-utils/sequelize-loader'
import { RedisService } from '@core/services'
import { TelegramMessage } from '@telegram/models'
import { ChannelType } from '@core/constants'

const app = initialiseServer(true)
let sequelize: Sequelize
let campaignId: number

beforeAll(async () => {
  sequelize = await sequelizeLoader(process.env.JEST_WORKER_ID || '1')
  await User.create({ id: 1, email: 'user@agency.gov.sg' })
  const campaign = await Campaign.create({
    name: 'campaign-1',
    userId: 1,
    type: ChannelType.Telegram,
    valid: false,
  })
  campaignId = campaign.id
})

afterAll(async () => {
  await TelegramMessage.destroy({ where: {} })
  await Campaign.destroy({ where: {} })
  await User.destroy({ where: {} })
  await sequelize.close()
  RedisService.otpClient.quit()
  RedisService.sessionClient.quit()
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

    const smsMessages = await TelegramMessage.count({
      where: { campaignId },
    })
    expect(smsMessages).toEqual(0)
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
