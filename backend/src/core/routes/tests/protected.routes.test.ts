import request from 'supertest'
import { Sequelize } from 'sequelize-typescript'
import initialiseServer from '@test-utils/server'
import { Campaign, ProtectedMessage, User } from '@core/models'
import sequelizeLoader from '@test-utils/sequelize-loader'
import { ChannelType } from '@core/constants'

const app = initialiseServer(true)
let sequelize: Sequelize
let campaignId: number

beforeAll(async () => {
  sequelize = await sequelizeLoader(process.env.JEST_WORKER_ID || '1')
  await User.create({ id: 1, email: 'user@agency.gov.sg' } as User)
  const campaign = await Campaign.create({
    name: 'campaign-1',
    userId: 1,
    type: ChannelType.Email,
    valid: false,
    protect: true,
  } as Campaign)
  campaignId = campaign.id
})

afterEach(async () => {
  await ProtectedMessage.destroy({ where: {}, force: true })
})

afterAll(async () => {
  await Campaign.destroy({ where: {}, force: true })
  await User.destroy({ where: {} })
  await sequelize.close()
  await (app as any).cleanup()
})

describe('POST /protected/{id}', () => {
  test('Fail to retrieve protected message for non-existent id', async () => {
    const id = '123'
    const res = await request(app).post(`/protect/${id}`).send({
      password_hash: 'abc',
    })
    expect(res.status).toBe(403)
    expect(res.body).toEqual({
      message: 'Wrong password or message id. Please try again.',
    })
  })

  test('Fail to retrieve protected message for wrong password hash', async () => {
    const id = '123'
    await ProtectedMessage.create({
      id: '123',
      campaignId,
      passwordHash: 'def',
      payload: 'encrypted message',
      version: 1,
    } as ProtectedMessage)

    const res = await request(app).post(`/protect/${id}`).send({
      password_hash: 'abc',
    })
    expect(res.status).toBe(403)
    expect(res.body).toEqual({
      message: 'Wrong password or message id. Please try again.',
    })
  })

  test('Successfully retrieve protected message', async () => {
    const id = '123'
    await ProtectedMessage.create({
      id: '123',
      campaignId,
      passwordHash: 'def',
      payload: 'encrypted message',
      version: 1,
    } as ProtectedMessage)

    const res = await request(app).post(`/protect/${id}`).send({
      password_hash: 'def',
    })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      payload: 'encrypted message',
    })
  })
})
