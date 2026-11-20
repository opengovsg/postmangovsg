import request from 'supertest'
import express from 'express'

const ALLOWED_ORIGIN = 'https://legacy.postman.gov.sg'

describe('CORS', () => {
  let app: express.Application

  beforeAll(async () => {
    process.env.FRONTEND_URL = ALLOWED_ORIGIN
    const { default: expressLoader } = await import(
      '@core/loaders/express.loader'
    )
    const {
      InitAuthService,
      InitOneGovSgService,
      InitCredentialService,
      RedisService,
    } = await import('@core/services')
    app = express()
    const redisService = new RedisService()
    ;(app as any).redisService = redisService
    ;(app as any).authService = InitAuthService(redisService)
    ;(app as any).oneGovSgService = InitOneGovSgService(redisService)
    ;(app as any).credentialService = InitCredentialService(redisService)
    expressLoader({ app })
  })

  afterAll(async () => {
    delete process.env.FRONTEND_URL
    await (app as any).redisService.shutdown()
  })

  test('allows credentialed requests from the configured origin', async () => {
    const res = await request(app).get('/').set('Origin', ALLOWED_ORIGIN)

    expect(res.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN)
    expect(res.headers['access-control-allow-credentials']).toBe('true')
  })

  // A string origin is sent as-is, never reflected, so the browser rejects
  // the response for any other origin
  test.each(['https://xss.postman.gov.sg', 'https://postman.gov.sg'])(
    'does not reflect %s in Access-Control-Allow-Origin',
    async (origin) => {
      const res = await request(app).get('/').set('Origin', origin)

      expect(res.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN)
    }
  )

  test('refuses to boot when FRONTEND_URL is a pattern', async () => {
    jest.resetModules()
    process.env.FRONTEND_URL =
      '/^https:\\/\\/([A-z0-9-]+\\.)?(postman\\.gov\\.sg)$/'

    const { default: config } = await import('@core/config')

    // setup.ts runs this at boot
    expect(() => config.validate()).toThrow('is not an origin')
  })
})
