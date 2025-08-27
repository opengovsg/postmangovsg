import request from 'supertest'
import { Sequelize } from 'sequelize-typescript'
import initialiseServer from '@test-utils/server'
import { Campaign, User, UserDemo, JobQueue } from '@core/models'
import sequelizeLoader from '@test-utils/sequelize-loader'
import { UploadService } from '@core/services'
import {
  ChannelType,
  JobStatus,
  Ordering,
  CampaignSortField,
  CampaignStatus,
} from '@core/constants'

const app = initialiseServer(true)
let sequelize: Sequelize

beforeAll(async () => {
  sequelize = await sequelizeLoader(process.env.JEST_WORKER_ID || '1')
  await User.create({ id: 1, email: 'user@agency.gov.sg' } as User)
})

afterEach(async () => {
  await JobQueue.destroy({ where: {} })
  await Campaign.destroy({ where: {}, force: true })
})

afterAll(async () => {
  await User.destroy({ where: {} })
  await sequelize.close()
  await UploadService.destroyUploadQueue()
  await (app as any).cleanup()
})

describe('GET /campaigns', () => {
  test('List campaigns with default limit and offset', async () => {
    await Campaign.create({
      name: 'campaign-1',
      userId: 1,
      type: ChannelType.SMS,
      valid: false,
      protect: false,
    } as Campaign)
    await Campaign.create({
      name: 'campaign-2',
      userId: 1,
      type: ChannelType.SMS,
      valid: false,
      protect: false,
    } as Campaign)

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
        type: ChannelType.SMS,
        valid: false,
        protect: false,
      } as Campaign)
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

  test('List campaign with offset exceeding number of campaigns', async () => {
    for (let i = 1; i <= 3; i++) {
      await Campaign.create({
        name: `campaign-${i}`,
        userId: 1,
        type: ChannelType.SMS,
        valid: false,
        protect: false,
      } as Campaign)
    }

    const res = await request(app)
      .get('/campaigns')
      .query({ limit: 1, offset: 4 })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      total_count: 3,
      campaigns: [],
    })
  })

  test('List campaign with limit exceeding number of campaigns', async () => {
    for (let i = 1; i <= 3; i++) {
      await Campaign.create({
        name: `campaign-${i}`,
        userId: 1,
        type: ChannelType.SMS,
        valid: false,
        protect: false,
      } as Campaign)
    }

    const res = await request(app)
      .get('/campaigns')
      .query({ limit: 4, offset: 0 })
    expect(res.status).toBe(200)
    expect(res.body.total_count).toEqual(3)
    for (let i = 1; i <= 3; i++) {
      expect(res.body.campaigns[i - 1].name).toEqual(
        `campaign-${3 - i + 1}` // default orderBy is desc
      )
    }
  })

  test('List campaign with offset and default limit', async () => {
    for (let i = 1; i <= 15; i++) {
      await Campaign.create({
        name: `campaign-${i}`,
        userId: 1,
        type: ChannelType.SMS,
        valid: false,
        protect: false,
      } as Campaign)
    }

    const res = await request(app).get('/campaigns').query({ offset: 2 })
    expect(res.status).toBe(200)
    expect(res.body.total_count).toEqual(15)
    for (let i = 1; i <= 10; i++) {
      expect(res.body.campaigns[i - 1].name).toEqual(
        `campaign-${15 - (i + 1)}` // default orderBy is desc
      )
    }
  })

  test('List campaign with offset and type filter', async () => {
    for (let i = 1; i <= 10; i++) {
      await Campaign.create({
        name: `campaign-${i}`,
        userId: 1,
        type: i > 5 ? ChannelType.Email : ChannelType.SMS,
        valid: false,
        protect: false,
      } as Campaign)
    }

    const res = await request(app)
      .get('/campaigns')
      .query({ offset: 4, type: ChannelType.Email })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      total_count: 5,
      campaigns: expect.arrayContaining([
        expect.objectContaining({
          name: `campaign-6`,
          type: ChannelType.Email,
        }),
      ]),
    })
  })

  test('List campaigns order by created at', async () => {
    for (let i = 1; i <= 3; i++) {
      await Campaign.create({
        name: `campaign-${i}`,
        userId: 1,
        type: ChannelType.SMS,
        valid: false,
        protect: false,
      } as Campaign)
    }

    const resAsc = await request(app)
      .get('/campaigns')
      .query({ order_by: Ordering.ASC, sort_by: CampaignSortField.Created })
    expect(resAsc.status).toBe(200)
    expect(resAsc.body.total_count).toEqual(3)
    for (let i = 1; i <= 3; i++) {
      expect(resAsc.body.campaigns[i - 1].name).toEqual(`campaign-${i}`)
    }

    const resDesc = await request(app)
      .get('/campaigns')
      .query({ order_by: Ordering.DESC, sort_by: CampaignSortField.Created })
    expect(resDesc.status).toBe(200)
    expect(resDesc.body.total_count).toEqual(3)
    for (let i = 1; i <= 3; i++) {
      expect(resDesc.body.campaigns[i - 1].name).toEqual(
        `campaign-${3 - i + 1}`
      )
    }
  })

  test('List campaigns order by sent at', async () => {
    for (let i = 1; i <= 3; i++) {
      const campaign = await Campaign.create({
        name: `campaign-${i}`,
        userId: 1,
        type: ChannelType.SMS,
        valid: false,
        protect: false,
      } as Campaign)
      // adding a Sending entry in JobQueue sets the sent time
      await JobQueue.create({
        campaignId: campaign.id,
        status: JobStatus.Sending,
      } as JobQueue)
    }

    const resSentAsc = await request(app)
      .get('/campaigns')
      .query({ order_by: Ordering.ASC, sort_by: CampaignSortField.Sent })
    expect(resSentAsc.status).toBe(200)
    expect(resSentAsc.body.total_count).toEqual(3)
    for (let i = 1; i <= 3; i++) {
      expect(resSentAsc.body.campaigns[i - 1].name).toEqual(`campaign-${i}`)
    }

    const resSentDesc = await request(app)
      .get('/campaigns')
      .query({ order_by: Ordering.DESC, sort_by: CampaignSortField.Sent })
    expect(resSentDesc.status).toBe(200)
    expect(resSentDesc.body.total_count).toEqual(3)
    for (let i = 1; i <= 3; i++) {
      expect(resSentDesc.body.campaigns[i - 1].name).toEqual(
        `campaign-${3 - i + 1}`
      )
    }
  })

  test('List campaigns filter by mode', async () => {
    const mode = [ChannelType.SMS, ChannelType.Email, ChannelType.Telegram]
    for (let i = 1; i <= 3; i++) {
      await Campaign.create({
        name: `campaign-${i}`,
        userId: 1,
        type: mode[i - 1],
        valid: false,
        protect: false,
      } as Campaign)
    }

    for (let i = 1; i <= 3; i++) {
      const res = await request(app)
        .get('/campaigns')
        .query({ type: mode[i - 1] })
      expect(res.status).toBe(200)
      expect(res.body).toEqual({
        total_count: 1,
        campaigns: expect.arrayContaining([
          expect.objectContaining({ name: `campaign-${i}` }),
        ]),
      })
    }
  })

  test('List campaigns filter by status', async () => {
    // create campaign-1 with the default job status Draft
    await Campaign.create({
      name: 'campaign-1',
      userId: 1,
      type: ChannelType.SMS,
      valid: false,
      protect: false,
    } as Campaign)

    //create campaign-2 with job status Sent by having a LOGGED entry in JobQueue
    const campaign = await Campaign.create({
      name: 'campaign-2',
      userId: 1,
      type: ChannelType.SMS,
      valid: false,
      protect: false,
    } as Campaign)
    await JobQueue.create({
      campaignId: campaign.id,
      status: JobStatus.Logged,
    } as JobQueue)

    const resDraft = await request(app)
      .get('/campaigns')
      .query({ status: CampaignStatus.Draft })
    expect(resDraft.status).toBe(200)
    expect(resDraft.body).toEqual({
      total_count: 1,
      campaigns: expect.arrayContaining([
        expect.objectContaining({ name: 'campaign-1' }),
      ]),
    })

    const resSent = await request(app)
      .get('/campaigns')
      .query({ status: CampaignStatus.Sent })
    expect(resSent.status).toBe(200)
    expect(resSent.body).toEqual({
      total_count: 1,
      campaigns: expect.arrayContaining([
        expect.objectContaining({ name: 'campaign-2' }),
      ]),
    })
  })

  test('List campaigns search by name', async () => {
    for (let i = 1; i <= 3; i++) {
      await Campaign.create({
        name: `campaign-${i}`,
        userId: 1,
        type: ChannelType.SMS,
        valid: false,
        protect: false,
      } as Campaign)
    }

    for (let i = 1; i <= 3; i++) {
      const res = await request(app)
        .get('/campaigns')
        .query({ name: i.toString() })
      expect(res.status).toBe(200)
      expect(res.body).toEqual({
        total_count: 1,
        campaigns: expect.arrayContaining([
          expect.objectContaining({ name: `campaign-${i}` }),
        ]),
      })
    }
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

  test('Fail to create demo SMS campaign', async () => {
    const campaign = {
      name: 'demo',
      type: ChannelType.SMS,
      demo_message_limit: 10,
    }
    const res = await request(app).post('/campaigns').send(campaign)
    expect(res.status).toBe(400)
    expect(res.body).toEqual(
      expect.objectContaining({
        code: 'api_validation',
        message: '"demo_message_limit" must be [null]',
      })
    )

    const demo = await UserDemo.findOne({ where: { userId: 1 } })
    expect(demo?.numDemosSms).toEqual(3)
  })

  test('Fail to create demo Telegram campaign', async () => {
    const campaign = {
      name: 'demo',
      type: ChannelType.Telegram,
      demo_message_limit: 10,
    }
    const res = await request(app).post('/campaigns').send(campaign)
    expect(res.status).toBe(400)
    expect(res.body).toEqual(
      expect.objectContaining({
        code: 'api_validation',
        message: '"demo_message_limit" must be [null]',
      })
    )

    const demo = await UserDemo.findOne({ where: { userId: 1 } })
    expect(demo?.numDemosTelegram).toEqual(3)
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
      type: ChannelType.SMS,
      protect: true,
    })
    expect(res.status).toBe(403)
  })
})

describe('DELETE /campaigns/:campaignId', () => {
  test('Delete a campaign based on its ID', async () => {
    const c = await Campaign.create({
      name: 'campaign-1',
      userId: 1,
      type: ChannelType.SMS,
      valid: false,
      protect: false,
    } as Campaign)

    const res = await request(app).delete(`/campaigns/${c.id}`)
    expect(res.status).toBe(200)
  })
  test('Returns 404 if the campaign ID doesnt exist', async () => {
    const res = await request(app).delete('/campaigns/696969')
    expect(res.status).toBe(404)
  })
})
