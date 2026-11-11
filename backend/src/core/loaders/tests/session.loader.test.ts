import request from 'supertest'
import { createHmac } from 'crypto'
import { Sequelize } from 'sequelize-typescript'
import initialiseServer from '@test-utils/server'
import sequelizeLoader from '@test-utils/sequelize-loader'
import config from '@core/config'
import { DEFAULT_TX_EMAIL_RATE_LIMIT, User } from '@core/models'

const app = initialiseServer()
let sequelize: Sequelize

beforeAll(async () => {
  sequelize = await sequelizeLoader(process.env.JEST_WORKER_ID || '1')
  await User.create({ id: 1, email: 'user@agency.gov.sg' } as User)
})

afterAll(async () => {
  await User.destroy({ where: {} })
  await sequelize.close()
  await (app as any).cleanup()
})

test('Using a session does not extend its expiry', async () => {
  const sid = 'seeded-session-id'
  const key = `sess:${sid}`
  const oneHour = 60 * 60
  const sessionClient = (app as any).redisService.sessionClient
  await new Promise((resolve) =>
    sessionClient.set(
      key,
      JSON.stringify({
        cookie: {
          expires: new Date(Date.now() + oneHour * 1000),
          originalMaxAge: config.get('session.cookieSettings.maxAge'),
          path: '/',
        },
        user: { id: 1, email: 'user@agency.gov.sg' },
        // What the Cookie authenticator sets, so the request leaves the session unchanged
        rateLimit: DEFAULT_TX_EMAIL_RATE_LIMIT,
      }),
      'EX',
      oneHour,
      resolve
    )
  )
  // express-session signs the session ID with an unpadded base64 HMAC-SHA256
  const signature = createHmac('sha256', config.get('session.secret'))
    .update(sid)
    .digest('base64')
    .replace(/=+$/, '')
  const cookie = `${config.get('session.cookieName')}=${encodeURIComponent(`s:${sid}.${signature}`)}`

  const res = await request(app).get('/campaigns').set('Cookie', cookie)

  expect(res.status).toBe(200)
  const ttl = await new Promise<number>((resolve) =>
    sessionClient.ttl(key, (_err: Error, value: number) => resolve(value))
  )
  expect(ttl).toBeGreaterThan(0)
  expect(ttl).toBeLessThanOrEqual(oneHour)
})
