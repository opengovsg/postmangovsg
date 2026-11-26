import express, { NextFunction, Request, Response } from 'express'
import expressWinston from 'express-winston'
import request from 'supertest'
import winston from 'winston'
import { Writable } from 'stream'
import { requestLogFilter } from '../request-log-filter'

// Mirrors the request logger and final error handler in express.loader.ts
const createApp = () => {
  const lines: string[] = []
  const errors: Error[] = []
  const logger = winston.createLogger({
    format: winston.format.json(),
    transports: [
      new winston.transports.Stream({
        stream: new Writable({
          write(chunk, _encoding, callback) {
            lines.push(chunk.toString())
            callback()
          },
        }),
      }),
    ],
  })

  const app = express()
  app.use('/v1/callback/email', express.text({ type: 'application/json' }))
  app.use(express.json())
  app.use(
    expressWinston.logger({
      winstonInstance: logger,
      requestWhitelist: ['method', 'url', 'body', 'headers'],
      responseWhitelist: ['statusCode'],
      requestFilter: requestLogFilter,
      metaField: null,
    })
  )
  app.post('/v1/callback/email', (_req, res) => res.sendStatus(200))
  app.post('/v1/transactional/email/send', (_req, res) => res.sendStatus(201))
  app.use(
    (err: Error, _req: Request, res: Response, _next: NextFunction): void => {
      errors.push(err)
      res.status(500).json({ code: 'internal_server' })
    }
  )
  return { app, lines, errors }
}

test('logs SES callbacks with a text body without throwing', async () => {
  const { app, lines, errors } = createApp()
  const snsBody = JSON.stringify({ Type: 'Notification', Message: '{}' })

  const res = await request(app)
    .post('/v1/callback/email')
    .set('Content-Type', 'application/json')
    .set('Authorization', 'Basic secret')
    .send(snsBody)

  expect(res.status).toBe(200)
  expect(errors).toEqual([])
  const logged = JSON.parse(lines[0])
  expect(logged.req.body).toBeUndefined()
  expect(logged.req.headers.authorization).toBe('[REDACTED]')
  expect(logged.res.statusCode).toBe(200)
})

test('still redacts the email body and attachments of JSON requests', async () => {
  const { app, lines, errors } = createApp()

  await request(app)
    .post('/v1/transactional/email/send')
    .send({
      subject: 'Hello',
      body: 'secret email body',
      attachments: { name: 'a.txt', data: 'secret file' },
    })

  expect(errors).toEqual([])
  const logged = JSON.parse(lines[0])
  expect(logged.req.body.subject).toBe('Hello')
  expect(logged.req.body.body).toBe('[REDACTED]')
  expect(logged.req.body.attachments).toEqual([
    { name: 'a.txt', data: '[REDACTED]' },
  ])
})
