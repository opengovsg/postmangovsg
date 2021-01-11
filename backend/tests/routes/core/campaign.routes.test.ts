import request from 'supertest'
import app from '../server'
import { campaignModelMock } from '@tests/setup'
import { CampaignService } from '@core/services'
import { Campaign } from '@core/models'

describe('GET /campaigns', () => {
  test('List campaigns with default limit and offset', async () => {
    campaignModelMock.$queueResult({
      rows: [campaignModelMock.build(), campaignModelMock.build()],
      count: 2,
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
    campaignModelMock.$queueResult({
      rows: [campaignModelMock.build({ id: 5 })],
      count: 1,
    })
    const res = await request(app)
      .get('/campaigns')
      .query({ limit: 1, offset: 2 })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      total_count: 1,
      campaigns: expect.arrayContaining([expect.objectContaining({ id: 5 })]),
    })
  })
})

describe('POST /campaigns', () => {
  test('Fail to create campaign', async () => {
    // Create campaign returns void when campaign creation fails
    CampaignService.createCampaignWithTransaction = jest.fn(
      async () => new Promise<void>((resolve) => resolve())
    )
    const res = await request(app).post('/campaigns').send({
      name: 'test',
      type: 'SMS',
    })
    expect(res.status).toBe(400)
    expect(res.body).toEqual({
      message: 'Unable to create campaign with these parameters',
    })
  })

  test('Successfully create SMS campaign', async () => {
    // Create campaign returns void when campaign creation fails
    CampaignService.createCampaignWithTransaction = jest.fn(
      async () =>
        new Promise<Campaign>((resolve) => resolve(campaignModelMock.build()))
    )
    const res = await request(app).post('/campaigns').send({
      name: 'test',
      type: 'SMS',
    })
    expect(res.status).toBe(201)
    expect(res.body).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        created_at: expect.any(String),
      })
    )
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
