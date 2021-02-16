import request from 'supertest'
import app from '../server'
import { Campaign, User, UserDemo } from '@core/models'
import sequelizeLoader from '../sequelize-loader'

beforeAll(async () => {
  await sequelizeLoader()
  await User.destroy({ where: {} })
  await UserDemo.destroy({ where: {} })
  await User.create({ id: 1, email: 'user@agency.gov.sg' })
})

afterEach(async () => {
  await Campaign.destroy({ where: {} })
})

describe('GET /campaigns', () => {
  test('List campaigns with default limit and offset', async () => {
    await Campaign.create({
      name: 'campaign-1',
      userId: 1,
      type: 'SMS',
      valid: false,
      protect: false,
    })
    await Campaign.create({
      name: 'campaign-2',
      userId: 1,
      type: 'SMS',
      valid: false,
      protect: false,
    })

    const res = await request(app).get('/campaigns')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      total_count: 2,
      campaigns: expect.arrayContaining([
        expect.objectContaining({ id: expect.any(Number) }),
      ]),
    })
  })

  test('List campaigns with defined limit and offset', async () => {
    for (let i = 1; i <= 3; i++) {
      await Campaign.create({
        name: `campaign-${i}`,
        userId: 1,
        type: 'SMS',
        valid: false,
        protect: false,
      })
    }

    const res = await request(app)
      .get('/campaigns')
      .query({ limit: 1, offset: 2 })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      total_count: 3,
      campaigns: expect.arrayContaining([
        expect.objectContaining({ name: 'campaign-1' }),
      ]),
    })
  })
})

describe('POST /campaigns', () => {
  test('Successfully create SMS campaign', async () => {
    const res = await request(app).post('/campaigns').send({
      name: 'test',
      type: 'SMS',
    })
    expect(res.status).toBe(201)
    expect(res.body).toEqual(
      expect.objectContaining({
        name: 'test',
        protect: false,
      })
    )
  })

  test('Successfully create demo SMS campaign', async () => {
    const res = await request(app).post('/campaigns').send({
      name: 'demo',
      type: 'SMS',
      demo_message_limit: 10,
    })
    expect(res.status).toBe(201)
    expect(res.body).toEqual(
      expect.objectContaining({
        name: 'demo',
        protect: false,
        demo_message_limit: 10,
      })
    )

    const demo = await UserDemo.findOne({ where: { userId: 1 } })
    expect(demo?.numDemosSms).toEqual(2)
  })

  test('Create protected campaign for unsupported channel', async () => {
    const res = await request(app).post('/campaigns').send({
      name: 'test',
      type: 'SMS',
      protect: true,
    })
    expect(res.status).toBe(403)
  })
})
