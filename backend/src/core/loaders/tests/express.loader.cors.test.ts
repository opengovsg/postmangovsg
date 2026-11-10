import request from 'supertest'
import express from 'express'

const ALLOWED_ORIGINS = [
  'https://legacy.postman.gov.sg',
  'https://tesseract.postman.gov.sg',
]

describe('CORS', () => {
  let app: express.Application

  beforeAll(async () => {
    process.env.FRONTEND_URL = ALLOWED_ORIGINS.join(',')
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

  test.each(ALLOWED_ORIGINS)(
    'allows credentialed requests from %s',
    async (origin) => {
      const res = await request(app).get('/').set('Origin', origin)

      expect(res.headers['access-control-allow-origin']).toBe(origin)
      expect(res.headers['access-control-allow-credentials']).toBe('true')
    }
  )

  test.each(['https://xss.postman.gov.sg', 'https://postman.gov.sg'])(
    'sends no Access-Control-Allow-Origin to %s',
    async (origin) => {
      const res = await request(app).get('/').set('Origin', origin)

      expect(res.headers['access-control-allow-origin']).toBeUndefined()
    }
  )

  test('refuses to boot when FRONTEND_URL is a pattern', () => {
    jest.isolateModules(() => {
      process.env.FRONTEND_URL =
        '/^https:\\/\\/([A-z0-9-]+\\.)?(postman\\.gov\\.sg)$/'
      expect(() => require('@core/config')).toThrow('is not an origin')
    })
  })
})
