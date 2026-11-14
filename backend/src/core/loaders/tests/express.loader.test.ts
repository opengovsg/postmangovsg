import express from 'express'
import request from 'supertest'
import winston from 'winston'
import { Writable } from 'stream'
import { addTransport } from '@core/logger'
import { requestLoggerMiddleware } from '@core/loaders/express.loader'

const logLines: any[] = []
addTransport(
  new winston.transports.Stream({
    stream: new Writable({
      write(chunk, _encoding, callback) {
        logLines.push(JSON.parse(chunk.toString()))
        callback()
      },
    }),
  })
)

const app = express()
app.use(express.json())
app.use(requestLoggerMiddleware)
app.post('/echo', (req, res) => res.json(req.body))
app.post('/v1/callback/telegram/:botToken', (_req, res) => res.sendStatus(200))

beforeEach(() => {
  logLines.length = 0
})

describe('requestLoggerMiddleware', () => {
  test.each([
    'body',
    'otp',
    'password_hash',
    'twilio_api_secret',
    'telegram_bot_token',
  ])('logs %s as [REDACTED] after the handler has read it', async (field) => {
    const res = await request(app)
      .post('/echo')
      .send({ [field]: 'secret-value', email: 'user@agency.gov.sg' })

    expect(res.body).toEqual({
      [field]: 'secret-value',
      email: 'user@agency.gov.sg',
    })
    const requestLog = logLines.find(
      (line) => line.message === 'Incoming HTTP Request POST /echo'
    )
    expect(requestLog.metadata.req.body).toEqual({
      [field]: '[REDACTED]',
      email: 'user@agency.gov.sg',
    })
  })

  test('does not log Telegram webhook requests, whose URL holds the bot token', async () => {
    const res = await request(app)
      .post('/v1/callback/telegram/123456:secret-token')
      .send({ message: { text: 'hello' } })

    expect(res.status).toBe(200)
    expect(logLines).toEqual([])
  })
})
