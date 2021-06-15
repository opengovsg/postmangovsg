import request from 'supertest'
import { Sequelize } from 'sequelize-typescript'
import initialiseServer from '@test-utils/server'
import { Campaign, ProtectedMessage, User } from '@core/models'
import sequelizeLoader from '@test-utils/sequelize-loader'
import { RedisService } from '@core/services'
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
    type: ChannelType.Email,
    valid: false,
    protect: true,
  })
  campaignId = campaign.id
})

afterEach(async () => {
  await ProtectedMessage.destroy({ where: {} })
})

afterAll(async () => {
  await Campaign.destroy({ where: {} })
  await User.destroy({ where: {} })
  await sequelize.close()
  RedisService.otpClient.quit()
  RedisService.sessionClient.quit()
})

describe('GET /protected/{id}', () => {
  test('Fail to retrieve protected message for non-existent id', async () => {
    const id = 123
    const res = await request(app).post(`/protect/${id}`).send({
      password_hash: 'abc',
    })
    expect(res.status).toBe(403)
    expect(res.body).toEqual({
      message: 'Wrong password or message id. Please try again.',
    })
  })

  test('Fail to retrieve protected message for wrong password hash', async () => {
    const id = 123
    await ProtectedMessage.create({
      id,
      campaignId,
      passwordHash: 'def',
      payload: 'encrypted message',
      version: 1,
    })

    const res = await request(app).post(`/protect/${id}`).send({
      password_hash: 'abc',
    })
    expect(res.status).toBe(403)
    expect(res.body).toEqual({
      message: 'Wrong password or message id. Please try again.',
    })
  })

  test('Successfully retrieve protected message', async () => {
    const id = 123
    await ProtectedMessage.create({
      id,
      campaignId,
      passwordHash: 'def',
      payload: 'encrypted message',
      version: 1,
    })

    const res = await request(app).post(`/protect/${id}`).send({
      password_hash: 'def',
    })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      payload: 'encrypted message',
    })
  })
})
