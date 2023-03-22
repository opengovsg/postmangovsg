import initialiseServer from '@test-utils/server'
import { Sequelize } from 'sequelize-typescript'
import sequelizeLoader from '@test-utils/sequelize-loader'
import { ApiKey, User } from '@core/models'
import request from 'supertest'

const app = initialiseServer()
const appWithUserSession = initialiseServer(true)
let sequelize: Sequelize

beforeAll(async () => {
  sequelize = await sequelizeLoader(process.env.JEST_WORKER_ID || '1')
})

afterEach(async () => {
  await ApiKey.destroy({ where: {}, force: true })
  await User.destroy({ where: {} })
})

afterAll(async () => {
  await sequelize.close()
  await (appWithUserSession as any).cleanup()
  await (app as any).cleanup()
})

describe('DELETE /api-key/:apiKeyId', () => {
  test('Attempting to deleting an API key without cookie', async () => {
    const res = await request(app).delete('/api-key/1')
    // this is currently gonna be 401 as auth middleware returns 401 for now
    expect(res.status).toBe(401)
  })
  test('Deleting a non existent API key', async () => {
    await User.create({ id: 1, email: 'user@agency.gov.sg' } as User)
    const res = await request(appWithUserSession).delete('/api-key/1')
    expect(res.status).toBe(404)
    expect(res.body.code).toEqual('not_found')
  })
  test('Deleting a valid API key', async () => {
    await User.create({ id: 1, email: 'user@agency.gov.sg' } as User)
    await ApiKey.create({
      id: 1,
      userId: '1',
      hash: 'hash',
      label: 'label',
      lastFive: '12345',
    } as ApiKey)
    const res = await request(appWithUserSession).delete('/api-key/1')
    expect(res.status).toBe(200)
    expect(res.body.api_key_id).toBe('1')
    const softDeletedApiKey = await ApiKey.findByPk(1)
    expect(softDeletedApiKey?.deletedAt).not.toBeNull()
  })
})

describe('GET /api-key/', () => {
  test('Attempting to get list without valid cookie', async () => {
    const res = await request(app).get('/api-key')
    expect(res.status).toBe(401)
  })
  test('Getting api key list when there are no api keys', async () => {
    await User.create({ id: 1, email: 'user@agency.gov.sg' } as User)
    const res = await request(appWithUserSession).get('/api-key')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(0)
  })
  test('Getting api key list with a few api keys', async () => {
    await User.create({ id: 1, email: 'user@agency.gov.sg' } as User)
    await ApiKey.create({
      id: 1,
      userId: '1',
      hash: 'hash',
      label: 'label',
      lastFive: '12345',
    } as ApiKey)
    await ApiKey.create({
      id: 2,
      userId: '1',
      hash: 'hash1',
      label: 'label1',
      lastFive: '22345',
    } as ApiKey)
    await ApiKey.create({
      id: 3,
      userId: '1',
      hash: 'hash2',
      label: 'label2',
      lastFive: '32345',
    } as ApiKey)
    const res = await request(appWithUserSession).get('/api-key')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(3)
    // should be arranged according to what was created most recently
    expect(res.body[0].id).toBe(3)
    expect(res.body[1].id).toBe(2)
    expect(res.body[2].id).toBe(1)
  })
})
