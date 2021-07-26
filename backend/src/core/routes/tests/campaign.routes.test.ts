import request from 'supertest'
import { Sequelize } from 'sequelize-typescript'
import initialiseServer from '@test-utils/server'
import { Campaign, User, UserDemo } from '@core/models'
import sequelizeLoader from '@test-utils/sequelize-loader'
import { RedisService, UploadService } from '@core/services'
import { ChannelType } from '@core/constants'

const app = initialiseServer(true)
let sequelize: Sequelize

beforeAll(async () => {
  sequelize = await sequelizeLoader(process.env.JEST_WORKER_ID || '1')
  await User.create({ id: 1, email: 'user@agency.gov.sg' })
})

afterEach(async () => {
  await Campaign.destroy({ where: {} })
})

afterAll(async () => {
  await User.destroy({ where: {} })
  await sequelize.close()
  await UploadService.destroyUploadQueue()
  await RedisService.shutdown()
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
      type: ChannelType.SMS,
    })
    expect(res.status).toBe(201)
    expect(res.body).toEqual(
      expect.objectContaining({
        name: 'test',
        type: ChannelType.SMS,
        protect: false,
      })
    )
  })

  test('Successfully create Email campaign', async () => {
    const res = await request(app).post('/campaigns').send({
      name: 'test',
      type: ChannelType.Email,
    })
    expect(res.status).toBe(201)
    expect(res.body).toEqual(
      expect.objectContaining({
        name: 'test',
        type: ChannelType.Email,
        protect: false,
      })
    )
  })

  test('Successfully create Protected Email campaign', async () => {
    const campaign = {
      name: 'test',
      type: ChannelType.Email,
      protect: true,
    }
    const res = await request(app).post('/campaigns').send(campaign)
    expect(res.status).toBe(201)
    expect(res.body).toEqual(expect.objectContaining(campaign))
  })

  test('Successfully create Telegram campaign', async () => {
    const res = await request(app).post('/campaigns').send({
      name: 'test',
      type: ChannelType.Telegram,
    })
    expect(res.status).toBe(201)
    expect(res.body).toEqual(
      expect.objectContaining({
        name: 'test',
        type: ChannelType.Telegram,
        protect: false,
      })
    )
  })

  test('Successfully create demo SMS campaign', async () => {
    const campaign = {
      name: 'demo',
      type: ChannelType.SMS,
      demo_message_limit: 10,
    }
    const res = await request(app).post('/campaigns').send(campaign)
    expect(res.status).toBe(201)
    expect(res.body).toEqual(
      expect.objectContaining({
        ...campaign,
        demo_message_limit: 10,
      })
    )

    const demo = await UserDemo.findOne({ where: { userId: 1 } })
    expect(demo?.numDemosSms).toEqual(2)
  })

  test('Successfully create demo Telegram campaign', async () => {
    const campaign = {
      name: 'demo',
      type: ChannelType.Telegram,
      demo_message_limit: 10,
    }
    const res = await request(app).post('/campaigns').send(campaign)
    expect(res.status).toBe(201)
    expect(res.body).toEqual(
      expect.objectContaining({
        ...campaign,
        demo_message_limit: 10,
      })
    )

    const demo = await UserDemo.findOne({ where: { userId: 1 } })
    expect(demo?.numDemosTelegram).toEqual(2)
  })

  test('Unable to create demo Telegram campaign after user has no demos left', async () => {
    const campaign = {
      name: 'demo',
      type: ChannelType.Telegram,
      demo_message_limit: 10,
    }
    await UserDemo.update({ numDemosTelegram: 0 }, { where: { userId: 1 } })
    const res = await request(app).post('/campaigns').send(campaign)
    expect(res.status).toBe(400)
  })

  test('Unable to create demo campaign for unsupported channel', async () => {
    const campaign = {
      name: 'demo',
      type: ChannelType.Email,
      demo_message_limit: 10,
    }
    const res = await request(app).post('/campaigns').send(campaign)
    expect(res.status).toBe(400)
  })

  test('Unable to create protected campaign for unsupported channel', async () => {
    const res = await request(app).post('/campaigns').send({
      name: 'test',
      type: 'SMS',
      protect: true,
    })
    expect(res.status).toBe(403)
  })
})
