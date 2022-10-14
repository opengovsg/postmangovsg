import request from 'supertest'
import { Sequelize } from 'sequelize-typescript'

import { User } from '@core/models'
import { RATE_LIMIT_ERROR_MESSAGE } from '@email/middlewares'
import {
  EmailMessageTransactional,
  TransactionalEmailMessageStatus,
} from '@email/models'
import { EmailService } from '@email/services'

import initialiseServer from '@test-utils/server'
import sequelizeLoader from '@test-utils/sequelize-loader'

let sequelize: Sequelize
let user: User
let apiKey: string
let mockSendEmail: jest.SpyInstance

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
  const endpoint = '/transactional/email/send'
  const genericApiCallFields = {
    recipient: 'recipient@agency.gov.sg',
    subject: 'subject',
    body: '<p>body</p>',
    from: 'Postman <donotreply@mail.postman.gov.sg>',
    reply_to: 'user@agency.gov.sg',
  }

  test('Should throw an error if API key is invalid', async () => {
    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer invalid-${apiKey}`)
      .send({})

    expect(res.status).toBe(401)
  })

  test('Should throw an error if API key is valid but payload is not', async () => {
    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${apiKey}`)
      .send({})

    expect(res.status).toBe(400)
  })

  test('Should send a message successfully', async () => {
    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${apiKey}`)
      .send(genericApiCallFields)

    expect(res.status).toBe(201)
    expect(res.body).toBeDefined()
    expect(typeof res.body.id).toBe('string')
    expect(mockSendEmail).toBeCalledTimes(1)
    const transactionalEmail = await EmailMessageTransactional.findOne({
      where: { userId: user.id.toString() },
    })
    expect(transactionalEmail).not.toBeNull()
    expect(transactionalEmail).toMatchObject({
      recipient: genericApiCallFields.recipient,
      from: genericApiCallFields.from,
      status: TransactionalEmailMessageStatus.Accepted,
      errorCode: null,
    })
    expect(transactionalEmail?.params).toMatchObject({
      subject: genericApiCallFields.subject,
      body: genericApiCallFields.body,
      from: genericApiCallFields.from,
    })
  })

  test('Should send a message with valid custom from name', async () => {
    const mockSendEmail = jest
      .spyOn(EmailService, 'sendEmail')
      .mockResolvedValue('message_id')

    const from = 'Hello <donotreply@mail.postman.gov.sg>'
    const res = await request(app)
      .post(endpoint)
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
    const transactionalEmail = await EmailMessageTransactional.findOne({
      where: { userId: user.id.toString() },
    })
    expect(transactionalEmail).not.toBeNull()
    expect(transactionalEmail).toMatchObject({
      recipient: genericApiCallFields.recipient,
      from: 'Hello <donotreply@mail.postman.gov.sg>',
      status: TransactionalEmailMessageStatus.Accepted,
      errorCode: null,
    })
    expect(transactionalEmail?.params).toMatchObject({
      subject: genericApiCallFields.subject,
      body: genericApiCallFields.body,
      from: 'Hello <donotreply@mail.postman.gov.sg>',
    })
  })

  // something I don't understand — is the verification of the from address mocked? or added to `email_from_address`?
  // afaict, user.email is not added to `email_from_address` in the test setup, yet somehow the test passes
  test('Should send a message with valid custom from address', async () => {
    const mockSendEmail = jest
      .spyOn(EmailService, 'sendEmail')
      .mockResolvedValue('message_id')

    const from = `Hello <${user.email}>`
    const res = await request(app)
      .post(endpoint)
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
    const transactionalEmail = await EmailMessageTransactional.findOne({
      where: { userId: user.id.toString() },
    })
    expect(transactionalEmail).not.toBeNull()
    expect(transactionalEmail).toMatchObject({
      recipient: genericApiCallFields.recipient,
      from: `Hello <${user.email}>`,
      status: TransactionalEmailMessageStatus.Accepted,
      errorCode: null,
    })
    expect(transactionalEmail?.params).toMatchObject({
      subject: genericApiCallFields.subject,
      body: genericApiCallFields.body,
      from: `Hello <${user.email}>`,
    })
  })

  test('Should thrown an error with invalid custom from address', async () => {
    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${apiKey}`)
      .send({
        ...genericApiCallFields,
        from: 'Hello <invalid@agency.gov.sg>',
        reply_to: user.email,
      })

    expect(res.status).toBe(400)
    expect(mockSendEmail).not.toBeCalled()
  })

  test('Should send a message with a valid attachment', async () => {
    // request.send() cannot be used with file attachments
    // substitute form values with request.field(). refer to
    // https://visionmedia.github.io/superagent/#multipart-requests
    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${apiKey}`)
      .field('recipient', genericApiCallFields.recipient)
      .field('subject', genericApiCallFields.subject)
      .field('body', genericApiCallFields.body)
      .field('from', genericApiCallFields.from)
      .field('reply_to', genericApiCallFields.reply_to)
      .attach('attachments', Buffer.from('hello world'), 'hi.txt')

    expect(res.status).toBe(201)
    expect(res.body).toBeDefined()
    expect(res.body.attachments_metadata).toBeDefined()
    expect(mockSendEmail).toBeCalledTimes(1)
    const transactionalEmail = await EmailMessageTransactional.findOne({
      where: { userId: user.id.toString() },
    })
    expect(transactionalEmail).not.toBeNull()
    expect(transactionalEmail).toMatchObject({
      recipient: genericApiCallFields.recipient,
      from: genericApiCallFields.from,
      status: TransactionalEmailMessageStatus.Accepted,
      errorCode: null,
    })
    expect(transactionalEmail?.params).toMatchObject({
      subject: genericApiCallFields.subject,
      body: genericApiCallFields.body,
      from: genericApiCallFields.from,
    })
    // TODO add attachment related fields
  })

  test('Requests should be rate limited', async () => {
    const send = (): Promise<request.Response> => {
      return request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${apiKey}`)
        .send(genericApiCallFields)
    }

    // First request passes
    let res = await send()
    expect(res.status).toBe(201)
    expect(mockSendEmail).toBeCalledTimes(1)
    mockSendEmail.mockClear()
    // should only return 1
    const firstEmail = await EmailMessageTransactional.findOne({
      where: { userId: user.id.toString() },
    })
    expect(firstEmail).not.toBeNull()
    expect(firstEmail).toMatchObject({
      recipient: genericApiCallFields.recipient,
      from: genericApiCallFields.from,
      status: TransactionalEmailMessageStatus.Accepted,
      errorCode: null,
    })
    expect(firstEmail?.params).toMatchObject({
      subject: genericApiCallFields.subject,
      body: genericApiCallFields.body,
      from: genericApiCallFields.from,
    })

    // Second request rate limited
    res = await send()
    expect(res.status).toBe(429)
    expect(mockSendEmail).not.toBeCalled()
    mockSendEmail.mockClear()
    // second email is created, but error code 429
    const secondEmail = await EmailMessageTransactional.findOne({
      where: { userId: user.id.toString() },
      order: [['createdAt', 'DESC']],
    })
    expect(secondEmail).not.toBeNull()
    expect(secondEmail).toMatchObject({
      recipient: genericApiCallFields.recipient,
      from: genericApiCallFields.from,
      status: TransactionalEmailMessageStatus.Unsent,
      errorCode: RATE_LIMIT_ERROR_MESSAGE,
    })
    expect(secondEmail?.params).toMatchObject({
      subject: genericApiCallFields.subject,
      body: genericApiCallFields.body,
      from: genericApiCallFields.from,
    })
  })

  test('Requests should not be rate limited after window elasped', async () => {
    const send = (): Promise<request.Response> => {
      return request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${apiKey}`)
        .send(genericApiCallFields)
    }

    // First request passes
    let res = await send()
    expect(res.status).toBe(201)
    expect(mockSendEmail).toBeCalledTimes(1)
    mockSendEmail.mockClear()
    const firstEmail = await EmailMessageTransactional.findOne({
      where: { userId: user.id.toString() },
    })
    expect(firstEmail).not.toBeNull()
    expect(firstEmail).toMatchObject({
      recipient: genericApiCallFields.recipient,
      from: genericApiCallFields.from,
      status: TransactionalEmailMessageStatus.Accepted,
      errorCode: null,
    })
    expect(firstEmail?.params).toMatchObject({
      subject: genericApiCallFields.subject,
      body: genericApiCallFields.body,
      from: genericApiCallFields.from,
    })

    // Second request rate limited
    res = await send()
    expect(res.status).toBe(429)
    expect(mockSendEmail).not.toBeCalled()
    mockSendEmail.mockClear()
    const secondEmail = await EmailMessageTransactional.findOne({
      where: { userId: user.id.toString() },
      order: [['createdAt', 'DESC']],
    })
    expect(secondEmail).not.toBeNull()
    expect(secondEmail).toMatchObject({
      recipient: genericApiCallFields.recipient,
      from: genericApiCallFields.from,
      status: TransactionalEmailMessageStatus.Unsent,
      errorCode: RATE_LIMIT_ERROR_MESSAGE,
    })
    expect(secondEmail?.params).toMatchObject({
      subject: genericApiCallFields.subject,
      body: genericApiCallFields.body,
      from: genericApiCallFields.from,
    })

    // Third request passes after 1s
    await new Promise((resolve) => setTimeout(resolve, 1000))
    res = await send()
    expect(res.status).toBe(201)
    expect(mockSendEmail).toBeCalledTimes(1)
    mockSendEmail.mockClear()
    const thirdEmail = await EmailMessageTransactional.findOne({
      where: { userId: user.id.toString() },
      order: [['createdAt', 'DESC']],
    })
    expect(thirdEmail).not.toBeNull()
    expect(thirdEmail).toMatchObject({
      recipient: genericApiCallFields.recipient,
      from: genericApiCallFields.from,
      status: TransactionalEmailMessageStatus.Accepted,
      errorCode: null,
    })
    expect(thirdEmail?.params).toMatchObject({
      subject: genericApiCallFields.subject,
      body: genericApiCallFields.body,
      from: genericApiCallFields.from,
    })
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
