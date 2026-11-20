import request from 'supertest'
import { createHmac } from 'crypto'
import { Sequelize } from 'sequelize-typescript'
import initialiseServer from '@test-utils/server'
import sequelizeLoader from '@test-utils/sequelize-loader'
import config from '@core/config'
import { User } from '@core/models'

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

const sessionClient = () => (app as any).redisService.sessionClient
const maxAge = config.get('session.cookieSettings.maxAge')
// Seed below maxAge, so a slide back up to maxAge shows as a larger TTL
const seededTtl = Math.floor(maxAge / 1000 / 2)

const seedSession = async (sid: string): Promise<string> => {
  await new Promise<void>((resolve, reject) =>
    sessionClient().set(
      `sess:${sid}`,
      JSON.stringify({
        cookie: {
          expires: new Date(Date.now() + seededTtl * 1000),
          originalMaxAge: maxAge,
          path: '/',
        },
        user: { id: 1, email: 'user@agency.gov.sg' },
      }),
      'EX',
      seededTtl,
      (err: Error | null) => (err ? reject(err) : resolve())
    )
  )
  // express-session signs the session ID with an unpadded base64 HMAC-SHA256
  const signature = createHmac('sha256', config.get('session.secret'))
    .update(sid)
    .digest('base64')
    .replace(/=+$/, '')
  return `${config.get('session.cookieName')}=${encodeURIComponent(`s:${sid}.${signature}`)}`
}

const expectTtlNotExtended = async (sid: string): Promise<void> => {
  const ttl = await new Promise<number>((resolve, reject) =>
    sessionClient().ttl(`sess:${sid}`, (err: Error | null, value: number) =>
      err ? reject(err) : resolve(value)
    )
  )
  expect(ttl).toBeGreaterThan(0)
  expect(ttl).toBeLessThanOrEqual(seededTtl)
}

test('Using a session does not extend its expiry', async () => {
  const sid = 'seeded-cookie-session'
  const cookie = await seedSession(sid)

  const res = await request(app).get('/campaigns').set('Cookie', cookie)

  expect(res.status).toBe(200)
  await expectTtlNotExtended(sid)
})

test('An API key request does not extend the expiry of a session sent with it', async () => {
  const sid = 'seeded-api-key-session'
  const cookie = await seedSession(sid)
  const { plainTextKey } = await (app as any).credentialService.generateApiKey(
    1,
    'test api key',
    ['user@agency.gov.sg']
  )

  // Needs a route that accepts only API keys; one that also accepts cookies would use the cookie
  const res = await request(app)
    .get('/transactional/email')
    .set('Cookie', cookie)
    .set('Authorization', `Bearer ${plainTextKey}`)

  expect(res.status).toBe(200)
  await expectTtlNotExtended(sid)
})
