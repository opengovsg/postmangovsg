import { User } from '@core/models'
import { EmailService } from '@email/services'
import sequelizeLoader from '@test-utils/sequelize-loader'
import initialiseServer from '@test-utils/server'
import { Sequelize } from 'sequelize-typescript'
import request from 'supertest'

let sequelize: Sequelize
let user: User
let userId = 1
let apiKey: string

const app = initialiseServer(false)

beforeEach(async () => {
  user = await User.create({
    id: userId,
    email: `user_${userId}@agency.gov.sg`,
  } as User)
  apiKey = await user.regenerateAndSaveApiKey()
  userId += 1
})

beforeAll(async () => {
  sequelize = await sequelizeLoader(process.env.JEST_WORKER_ID || '1')
  // Flush the rate limit redis database
  await new Promise((resolve) =>
    (app as any).redisService.rateLimitClient.flushdb(resolve)
  )
})

afterEach(() => jest.resetAllMocks())

afterAll(async () => {
  await User.destroy({ where: {} })
  await sequelize.close()

  await new Promise((resolve) =>
    (app as any).redisService.rateLimitClient.flushdb(resolve)
  )
  await (app as any).cleanup()
})

describe('POST /transactional/email/send', () => {
  test('Should throw an error if API key is invalid', async () => {
    const res = await request(app)
      .post('/transactional/email/send')
      .set('Authorization', `Bearer invalid-${apiKey}`)
      .send({})

    expect(res.status).toBe(401)
  })

  test('Should throw an error if API key is valid but payload is not', async () => {
    const res = await request(app)
      .post('/transactional/email/send')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({})

    expect(res.status).toBe(400)
  })

  test('Should send a message successfully', async () => {
    const mockSendEmail = jest
      .spyOn(EmailService, 'sendEmail')
      .mockResolvedValue('message_id')

    const res = await request(app)
      .post('/transactional/email/send')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({
        recipient: 'recipient@agency.gov.sg',
        subject: 'subject',
        body: '<p>body</p>',
        from: 'Postman <donotreply@mail.postman.gov.sg>',
        reply_to: 'user@agency.gov.sg',
      })

    expect(res.status).toBe(202)
    expect(mockSendEmail).toBeCalledTimes(1)
  })

  test('Should send a message with valid custom from name', async () => {
    const mockSendEmail = jest
      .spyOn(EmailService, 'sendEmail')
      .mockResolvedValue('message_id')

    const res = await request(app)
      .post('/transactional/email/send')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({
        recipient: 'recipient@agency.gov.sg',
        subject: 'subject',
        body: '<p>body</p>',
        from: 'Hello <donotreply@mail.postman.gov.sg>',
        reply_to: user.email,
      })

    expect(res.status).toBe(202)
    expect(mockSendEmail).toBeCalledTimes(1)
  })

  test('Should send a message with valid custom from address', async () => {
    const mockSendEmail = jest
      .spyOn(EmailService, 'sendEmail')
      .mockResolvedValue('message_id')

    const res = await request(app)
      .post('/transactional/email/send')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({
        recipient: 'recipient@agency.gov.sg',
        subject: 'subject',
        body: '<p>body</p>',
        from: `Hello <${user.email}>`,
        reply_to: user.email,
      })

    expect(res.status).toBe(202)
    expect(mockSendEmail).toBeCalledTimes(1)
  })

  test('Should thrown an error with invalid custom from address', async () => {
    const mockSendEmail = jest
      .spyOn(EmailService, 'sendEmail')
      .mockResolvedValue('message_id')

    const res = await request(app)
      .post('/transactional/email/send')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({
        recipient: 'recipient@agency.gov.sg',
        subject: 'subject',
        body: '<p>body</p>',
        from: 'Hello <invalid@agency.gov.sg>',
        reply_to: user.email,
      })

    expect(res.status).toBe(400)
    expect(mockSendEmail).not.toBeCalled()
  })

  test('Should send a message with a valid attachment', async () => {
    const mockSendEmail = jest
      .spyOn(EmailService, 'sendEmail')
      .mockResolvedValue('message_id')

    // request.send() cannot be used with file attachments
    // substitute form values with request.field(). refer to
    // https://visionmedia.github.io/superagent/#multipart-requests
    const res = await request(app)
      .post('/transactional/email/send')
      .set('Authorization', `Bearer ${apiKey}`)
      .field('recipient', 'recipient@agency.gov.sg')
      .field('subject', 'subject')
      .field('body', '<p>body</p>')
      .field('from', 'Postman <donotreply@mail.postman.gov.sg>')
      .field('reply_to', 'user@agency.gov.sg')
      .attach('attachments', Buffer.from('hello world'), 'hi.txt')

    expect(res.status).toBe(202)
    expect(mockSendEmail).toBeCalledTimes(1)
  })

  test('Requests should be rate limited', async () => {
    const mockSendEmail = jest
      .spyOn(EmailService, 'sendEmail')
      .mockResolvedValue('message_id')
    const send = (): Promise<request.Response> => {
      return request(app)
        .post('/transactional/email/send')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({
          recipient: 'recipient@agency.gov.sg',
          subject: 'subject',
          body: '<p>body</p>',
          from: 'Postman <donotreply@mail.postman.gov.sg>',
          reply_to: user.email,
        })
    }

    // First request passes
    let res = await send()
    expect(res.status).toBe(202)
    expect(mockSendEmail).toBeCalledTimes(1)
    mockSendEmail.mockClear()

    // Second request rate limited
    res = await send()
    expect(res.status).toBe(429)
    expect(mockSendEmail).not.toBeCalled()
    mockSendEmail.mockClear()
  })

  test('Requests should not be rate limited after window elasped', async () => {
    const mockSendEmail = jest
      .spyOn(EmailService, 'sendEmail')
      .mockResolvedValue('message_id')
    const send = (): Promise<request.Response> => {
      return request(app)
        .post('/transactional/email/send')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({
          recipient: 'recipient@agency.gov.sg',
          subject: 'subject',
          body: '<p>body</p>',
          from: 'Postman <donotreply@mail.postman.gov.sg>',
          reply_to: user.email,
        })
    }

    // First request passes
    let res = await send()
    expect(res.status).toBe(202)
    expect(mockSendEmail).toBeCalledTimes(1)
    mockSendEmail.mockClear()

    // Second request rate limited
    res = await send()
    expect(res.status).toBe(429)
    expect(mockSendEmail).not.toBeCalled()
    mockSendEmail.mockClear()

    // Third request passes after 1s
    await new Promise((resolve) => setTimeout(resolve, 1000))
    res = await send()
    expect(res.status).toBe(202)
    expect(mockSendEmail).toBeCalledTimes(1)
    mockSendEmail.mockClear()
  })
})
