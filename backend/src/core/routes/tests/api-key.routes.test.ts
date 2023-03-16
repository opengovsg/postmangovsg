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
  await ApiKey.destroy({ where: {} })
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
    expect(res.status).toBe(403)
  })
  test('Deleting a non existent API key', async () => {
    await User.create({ id: 1, email: 'user@agency.gov.sg' } as User)
    const res = await request(appWithUserSession).delete('/api-key/1')
    expect(res.status).toBe(404)
    expect(res.body.get('message')).toEqual('Could not find API key to delete')
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
  })
})
