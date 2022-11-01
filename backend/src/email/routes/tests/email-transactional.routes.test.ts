import request from 'supertest'
import { Sequelize } from 'sequelize-typescript'

import { User } from '@core/models'
import { EmailService } from '@email/services'

import initialiseServer from '@test-utils/server'
import sequelizeLoader from '@test-utils/sequelize-loader'
import {
  EmailMessageTransactional,
  TransactionalEmailMessageStatus,
} from '@email/models'

let sequelize: Sequelize
let user: User
let apiKey: string

const app = initialiseServer(false)

beforeEach(async () => {
  sequelize = await sequelizeLoader(process.env.JEST_WORKER_ID || '1')
  // Flush the rate limit redis database
  await new Promise((resolve) =>
    (app as any).redisService.rateLimitClient.flushdb(resolve)
  )
  user = await User.create({
    id: 1,
    email: `user_1@agency.gov.sg`,
  } as User)
  apiKey = await user.regenerateAndSaveApiKey()
})

afterEach(async () => {
  jest.resetAllMocks()
  await EmailMessageTransactional.destroy({ where: {} })
  await User.destroy({ where: {} })
  await sequelize.close()
})

afterAll(async () => {
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

    expect(res.status).toBe(201)
    expect(res.body).toBeDefined()
    expect(typeof res.body.id).toBe('string')
    expect(mockSendEmail).toBeCalledTimes(1)
  })

  test('Should send a message with valid custom from name', async () => {
    const mockSendEmail = jest
      .spyOn(EmailService, 'sendEmail')
      .mockResolvedValue('message_id')

    const from = 'Hello <donotreply@mail.postman.gov.sg>'
    const res = await request(app)
      .post('/transactional/email/send')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({
        recipient: 'recipient@agency.gov.sg',
        subject: 'subject',
        body: '<p>body</p>',
        from,
        reply_to: user.email,
      })

    expect(res.status).toBe(201)
    expect(res.body).toBeDefined()
    expect(res.body.from).toBe(from)
    expect(mockSendEmail).toBeCalledTimes(1)
  })

  test('Should send a message with valid custom from address', async () => {
    const mockSendEmail = jest
      .spyOn(EmailService, 'sendEmail')
      .mockResolvedValue('message_id')

    const from = `Hello <${user.email}>`
    const res = await request(app)
      .post('/transactional/email/send')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({
        recipient: 'recipient@agency.gov.sg',
        subject: 'subject',
        body: '<p>body</p>',
        from,
        reply_to: user.email,
      })

    expect(res.status).toBe(201)
    expect(res.body).toBeDefined()
    expect(res.body.from).toBe(from)
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

    expect(res.status).toBe(201)
    expect(res.body).toBeDefined()
    expect(res.body.attachments_metadata).toBeDefined()
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
    expect(res.status).toBe(201)
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
    expect(res.status).toBe(201)
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
    expect(res.status).toBe(201)
    expect(mockSendEmail).toBeCalledTimes(1)
    mockSendEmail.mockClear()
  })
})

describe('GET /transactional/email/:emailId', () => {
  test('should return a transactional email message with corresponding ID', async () => {
    const message = await EmailMessageTransactional.create({
      userId: user.id,
      recipient: 'recipient@agency.gov.sg',
      from: 'Postman <donotreply@mail.postman.gov.sg>',
      params: {
        from: 'Postman <donotreply@mail.postman.gov.sg>',
        subject: 'Test',
        body: 'Test Body',
      },
      status: TransactionalEmailMessageStatus.Delivered,
    } as unknown as EmailMessageTransactional)
    const res = await request(app)
      .get(`/transactional/email/${message.id}`)
      .set('Authorization', `Bearer ${apiKey}`)
    expect(res.status).toBe(200)
    expect(res.body).toBeDefined()
    expect(res.body.id).toBe(message.id)
  })

  test('should return 404 if the transactional email message ID not found', async () => {
    const id = 69
    const res = await request(app)
      .get(`/transactional/email/${id}`)
      .set('Authorization', `Bearer ${apiKey}`)
    expect(res.status).toBe(404)
    expect(res.body.message).toBe(`Email message with ID ${id} not found.`)
  })

  test('should return 404 if the transactional email message belongs to another user', async () => {
    const anotherUser = await User.create({
      id: 2,
      email: 'user_2@agency.gov.sg',
    } as User)
    const anotherApiKey = await anotherUser.regenerateAndSaveApiKey()
    const message = await EmailMessageTransactional.create({
      userId: user.id,
      recipient: 'recipient@agency.gov.sg',
      from: 'Postman <donotreply@mail.postman.gov.sg>',
      params: {
        from: 'Postman <donotreply@mail.postman.gov.sg>',
        subject: 'Test',
        body: 'Test Body',
      },
      status: TransactionalEmailMessageStatus.Delivered,
    } as unknown as EmailMessageTransactional)
    const res = await request(app)
      .get(`/transactional/email/${message.id}`)
      .set('Authorization', `Bearer ${anotherApiKey}`)
    expect(res.status).toBe(404)
    expect(res.body.message).toBe(
      `Email message with ID ${message.id} not found.`
    )
  })
})
