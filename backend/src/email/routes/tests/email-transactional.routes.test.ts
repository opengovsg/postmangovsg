const mockScanFile = jest.fn().mockResolvedValue(true)
jest.mock('@core/services/cloudmersive-client.class', () => {
  return jest.fn().mockImplementation(() => {
    return { scanFile: mockScanFile }
  })
})

import request from 'supertest'
import { Sequelize } from 'sequelize-typescript'

import { User } from '@core/models'
import {
  FileExtensionService,
  MALICIOUS_FILE_ERROR_CODE,
  UNSUPPORTED_FILE_TYPE_ERROR_CODE,
} from '@core/services'
import { RATE_LIMIT_ERROR_MESSAGE } from '@email/middlewares'
import {
  EmailMessageTransactional,
  TransactionalEmailMessageStatus,
} from '@email/models'
import {
  BLACKLISTED_RECIPIENT_ERROR_CODE,
  EmailService,
  EMPTY_MESSAGE_ERROR_CODE,
} from '@email/services'

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
    email: 'user_1@agency.gov.sg',
  } as User)
  apiKey = await user.regenerateAndSaveApiKey()
})

afterEach(async () => {
  jest.restoreAllMocks()
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

const emailTransactionalRoute = '/transactional/email'

describe(`${emailTransactionalRoute}/send`, () => {
  const endpoint = `${emailTransactionalRoute}/send`
  const validApiCall = {
    recipient: 'recipient@agency.gov.sg',
    subject: 'subject',
    body: '<p>body</p>',
    from: 'Postman <donotreply@mail.postman.gov.sg>',
    reply_to: 'user@agency.gov.sg',
  }
  const validAttachment = Buffer.from('hello world')
  const validAttachmentName = 'hi.txt'
  const validAttachmentHashRegex = /^[a-f0-9]{32}$/ // MD5 32 characters
  const validAttachmentSize = Buffer.byteLength(validAttachment)

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

  test('Should send email successfully and metadata is saved correctly in db', async () => {
    mockSendEmail = jest
      .spyOn(EmailService, 'sendEmail')
      .mockResolvedValue('message_id')
    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${apiKey}`)
      .send(validApiCall)

    expect(res.status).toBe(201)
    expect(res.body).toBeDefined()
    expect(typeof res.body.id).toBe('string')
    expect(mockSendEmail).toBeCalledTimes(1)
    const transactionalEmail = await EmailMessageTransactional.findOne({
      where: { userId: user.id.toString() },
    })
    expect(transactionalEmail).not.toBeNull()
    expect(transactionalEmail).toMatchObject({
      recipient: validApiCall.recipient,
      from: validApiCall.from,
      status: TransactionalEmailMessageStatus.Accepted,
      errorCode: null,
    })
    expect(transactionalEmail?.params).toMatchObject({
      subject: validApiCall.subject,
      body: validApiCall.body,
      from: validApiCall.from,
      reply_to: validApiCall.reply_to,
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
      recipient: validApiCall.recipient,
      from: 'Hello <donotreply@mail.postman.gov.sg>',
      status: TransactionalEmailMessageStatus.Accepted,
      errorCode: null,
    })
    expect(transactionalEmail?.params).toMatchObject({
      subject: validApiCall.subject,
      body: validApiCall.body,
      from: 'Hello <donotreply@mail.postman.gov.sg>',
      reply_to: user.email,
    })
  })

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
      recipient: validApiCall.recipient,
      from: `Hello <${user.email}>`,
      status: TransactionalEmailMessageStatus.Accepted,
      errorCode: null,
    })
    expect(transactionalEmail?.params).toMatchObject({
      subject: validApiCall.subject,
      body: validApiCall.body,
      from: `Hello <${user.email}>`,
      reply_to: user.email,
    })
  })

  test('Should thrown an error with invalid custom from address', async () => {
    mockSendEmail = jest.spyOn(EmailService, 'sendEmail')
    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${apiKey}`)
      .send({
        ...validApiCall,
        from: 'Hello <invalid@agency.gov.sg>',
        reply_to: user.email,
      })

    expect(res.status).toBe(400)
    expect(mockSendEmail).not.toBeCalled()
  })

  test('Should throw an error if email subject or body is empty after removing invalid HTML tags and correct error is saved in db', async () => {
    mockSendEmail = jest.spyOn(EmailService, 'sendEmail')
    const invalidHtmlTagsSubjectAndBody = {
      subject: '\n\n\n',
      body: '<script></script>',
    }
    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${apiKey}`)
      .send({
        ...validApiCall,
        subject: invalidHtmlTagsSubjectAndBody.subject,
        body: invalidHtmlTagsSubjectAndBody.body,
      })

    expect(res.status).toBe(400)
    expect(mockSendEmail).not.toBeCalled()

    const transactionalEmail = await EmailMessageTransactional.findOne({
      where: { userId: user.id.toString() },
    })
    expect(transactionalEmail).not.toBeNull()
    expect(transactionalEmail).toMatchObject({
      recipient: validApiCall.recipient,
      from: validApiCall.from,
      status: TransactionalEmailMessageStatus.Unsent,
    })
    expect(transactionalEmail?.params).toMatchObject({
      // NB sanitisation only occurs at sending step, doesn't affect saving in params
      subject: invalidHtmlTagsSubjectAndBody.subject,
      body: invalidHtmlTagsSubjectAndBody.body,
      from: validApiCall.from,
      reply_to: validApiCall.reply_to,
    })
    expect(transactionalEmail?.errorCode).toBe(EMPTY_MESSAGE_ERROR_CODE)
  })

  test('Should send email if subject and body are not empty after removing invalid HTML tags and metadata is saved correctly in db', async () => {
    mockSendEmail = jest
      .spyOn(EmailService, 'sendEmail')
      .mockResolvedValue('message_id')
    const invalidHtmlTagsSubjectAndBody = {
      subject: 'HELLO',
      body: '<script>alert("hello")</script>',
    }

    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${apiKey}`)
      .send({
        ...validApiCall,
        subject: invalidHtmlTagsSubjectAndBody.subject,
        body: invalidHtmlTagsSubjectAndBody.body,
      })

    expect(res.status).toBe(201)
    expect(mockSendEmail).toBeCalled()

    const transactionalEmail = await EmailMessageTransactional.findOne({
      where: { userId: user.id.toString() },
    })
    expect(transactionalEmail).not.toBeNull()
    expect(transactionalEmail).toMatchObject({
      recipient: validApiCall.recipient,
      from: validApiCall.from,
      status: TransactionalEmailMessageStatus.Accepted,
    })
    expect(transactionalEmail?.params).toMatchObject({
      // NB sanitisation only occurs at sending step, doesn't affect saving in params
      subject: invalidHtmlTagsSubjectAndBody.subject,
      body: invalidHtmlTagsSubjectAndBody.body,
      from: validApiCall.from,
      reply_to: validApiCall.reply_to,
    })
    expect(transactionalEmail?.errorCode).toBe(null)

    expect(mockSendEmail).toBeCalledWith(
      {
        subject: 'HELLO',
        from: validApiCall.from,
        body: 'alert("hello")',
        recipients: [validApiCall.recipient],
        replyTo: validApiCall.reply_to,
        referenceId: (
          transactionalEmail as EmailMessageTransactional
        ).id.toString(),
        attachments: undefined,
      },
      { extraSmtpHeaders: { isTransactional: true } }
    )
  })
  test('Should throw a 400 error if the body size is too large (JSON payload)', async () => {
    mockSendEmail = jest.spyOn(EmailService, 'sendEmail')
    const body = 'a'.repeat(1024 * 1024 * 5) // 5MB
    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${apiKey}`)
      .send({
        ...validApiCall,
        body,
      })
    expect(res.status).toBe(400)
    expect(mockSendEmail).not.toBeCalled()
  })

  test('Should throw a 413 error if body size is wayyy too large (JSON payload)', async () => {
    mockSendEmail = jest.spyOn(EmailService, 'sendEmail')
    const body = 'a'.repeat(1024 * 1024 * 15) // 15MB
    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${apiKey}`)
      .send({
        ...validApiCall,
        body,
      })
    expect(res.status).toBe(413)
    expect(mockSendEmail).not.toBeCalled()
  })

  test('Should throw a 400 error if the body size is too large (multipart payload)', async () => {
    mockSendEmail = jest.spyOn(EmailService, 'sendEmail')
    const body = 'a'.repeat(1024 * 1024 * 5) // 5MB
    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${apiKey}`)
      .field('recipient', validApiCall.recipient)
      .field('subject', validApiCall.subject)
      .field('from', validApiCall.from)
      .field('reply_to', validApiCall.reply_to)
      .field('body', body)
    expect(res.status).toBe(400)
    expect(mockSendEmail).not.toBeCalled()
  })

  test('Should throw a 400 error even if body size is wayyy too large because of truncation (multipart payload)', async () => {
    mockSendEmail = jest.spyOn(EmailService, 'sendEmail')
    const body = 'a'.repeat(1024 * 1024 * 15) // 15MB
    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${apiKey}`)
      .field('recipient', validApiCall.recipient)
      .field('subject', validApiCall.subject)
      .field('from', validApiCall.from)
      .field('reply_to', validApiCall.reply_to)
      .field('body', body)
    expect(res.status).toBe(400)
    expect(mockSendEmail).not.toBeCalled()
  })

  test('Should throw an error if file type of attachment is not supported and correct error is saved in db', async () => {
    mockSendEmail = jest.spyOn(EmailService, 'sendEmail')
    // not actually an invalid file type; FileExtensionService checks magic number
    const invalidFileTypeAttachment = Buffer.alloc(1024 * 1024, '.')
    const invalidFileTypeAttachmentName = 'invalid.exe'
    // instead, we just mock the service to return false
    const mockFileTypeCheck = jest
      .spyOn(FileExtensionService, 'hasAllowedExtensions')
      .mockResolvedValue(false)

    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${apiKey}`)
      .field('recipient', validApiCall.recipient)
      .field('subject', validApiCall.subject)
      .field('body', validApiCall.body)
      .field('from', validApiCall.from)
      .field('reply_to', validApiCall.reply_to)
      .attach(
        'attachments',
        invalidFileTypeAttachment,
        invalidFileTypeAttachmentName
      )

    expect(res.status).toBe(400)
    expect(mockSendEmail).not.toBeCalled()
    expect(mockFileTypeCheck).toBeCalledTimes(1)
    mockFileTypeCheck.mockClear()

    const transactionalEmail = await EmailMessageTransactional.findOne({
      where: { userId: user.id.toString() },
    })
    expect(transactionalEmail).not.toBeNull()
    expect(transactionalEmail).toMatchObject({
      recipient: validApiCall.recipient,
      from: validApiCall.from,
      status: TransactionalEmailMessageStatus.Unsent,
    })
    expect(transactionalEmail?.params).toMatchObject({
      from: validApiCall.from,
      reply_to: validApiCall.reply_to,
    })
    expect(transactionalEmail?.errorCode).toBe(UNSUPPORTED_FILE_TYPE_ERROR_CODE)
  })

  test('Should throw an error if attached file is malicious and correct error is saved in db', async () => {
    mockSendEmail = jest.spyOn(EmailService, 'sendEmail')
    // not actually a malicious file
    const maliciousAttachment = Buffer.alloc(1024 * 1024, '.')
    const maliciousAttachmentName = 'malicious.txt'
    // so we mock scanFile to return false
    mockScanFile.mockResolvedValueOnce(false)

    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${apiKey}`)
      .field('recipient', validApiCall.recipient)
      .field('subject', validApiCall.subject)
      .field('body', validApiCall.body)
      .field('from', validApiCall.from)
      .field('reply_to', validApiCall.reply_to)
      .attach('attachments', maliciousAttachment, maliciousAttachmentName)

    expect(res.status).toBe(400)
    expect(mockSendEmail).not.toBeCalled()

    const transactionalEmail = await EmailMessageTransactional.findOne({
      where: { userId: user.id.toString() },
    })
    expect(transactionalEmail).not.toBeNull()
    expect(transactionalEmail).toMatchObject({
      recipient: validApiCall.recipient,
      from: validApiCall.from,
      status: TransactionalEmailMessageStatus.Unsent,
    })
    expect(transactionalEmail?.params).toMatchObject({
      from: validApiCall.from,
      reply_to: validApiCall.reply_to,
    })
    expect(transactionalEmail?.errorCode).toBe(MALICIOUS_FILE_ERROR_CODE)
  })

  test('Should throw an error if recipient is blacklisted and correct error is saved in db', async () => {
    mockSendEmail = jest.spyOn(EmailService, 'sendEmail')
    // not actually a blacklisted recipient
    const blacklistedRecipient = 'blacklisted@baddomain.com'
    // instead, mock to return recipient as blacklisted
    const mockIsBlacklisted = jest
      .spyOn(EmailService, 'isRecipientBlacklisted')
      .mockResolvedValue(true)
    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${apiKey}`)
      .send({
        ...validApiCall,
        recipient: blacklistedRecipient,
      })

    expect(res.status).toBe(400)
    expect(mockSendEmail).not.toBeCalled()
    expect(mockIsBlacklisted).toBeCalledTimes(1)
    mockIsBlacklisted.mockClear()

    const transactionalEmail = await EmailMessageTransactional.findOne({
      where: { userId: user.id.toString() },
    })
    expect(transactionalEmail).not.toBeNull()
    expect(transactionalEmail).toMatchObject({
      recipient: blacklistedRecipient,
      from: validApiCall.from,
      status: TransactionalEmailMessageStatus.Unsent,
    })
    expect(transactionalEmail?.params).toMatchObject({
      from: validApiCall.from,
      reply_to: validApiCall.reply_to,
    })
    expect(transactionalEmail?.errorCode).toBe(BLACKLISTED_RECIPIENT_ERROR_CODE)
  })

  test('Should send email with a valid attachment and attachment metadata is saved correctly in db', async () => {
    mockSendEmail = jest
      .spyOn(EmailService, 'sendEmail')
      .mockResolvedValue('message_id')

    // request.send() cannot be used with file attachments
    // substitute form values with request.field(). refer to
    // https://visionmedia.github.io/superagent/#multipart-requests
    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${apiKey}`)
      .field('recipient', validApiCall.recipient)
      .field('subject', validApiCall.subject)
      .field('body', validApiCall.body)
      .field('from', validApiCall.from)
      .field('reply_to', validApiCall.reply_to)
      .attach('attachments', validAttachment, validAttachmentName)

    expect(res.status).toBe(201)
    expect(res.body).toBeDefined()
    expect(res.body.attachments_metadata).toBeDefined()
    expect(mockSendEmail).toBeCalledTimes(1)
    const transactionalEmail = await EmailMessageTransactional.findOne({
      where: { userId: user.id.toString() },
    })
    expect(transactionalEmail).not.toBeNull()
    expect(transactionalEmail).toMatchObject({
      recipient: validApiCall.recipient,
      from: validApiCall.from,
      status: TransactionalEmailMessageStatus.Accepted,
      errorCode: null,
    })
    expect(transactionalEmail?.params).toMatchObject({
      subject: validApiCall.subject,
      body: validApiCall.body,
      from: validApiCall.from,
      reply_to: validApiCall.reply_to,
    })
    expect(transactionalEmail?.attachmentsMetadata).not.toBeNull()
    expect(transactionalEmail?.attachmentsMetadata).toHaveLength(1)
    expect(transactionalEmail?.attachmentsMetadata).toMatchObject([
      {
        fileName: validAttachmentName,
        fileSize: validAttachmentSize,
        hash: expect.stringMatching(validAttachmentHashRegex),
      },
    ])
  })

  test('Email with attachment that exceeds limit should fail', async () => {
    mockSendEmail = jest.spyOn(EmailService, 'sendEmail')
    const invalidAttachmentTooBig = Buffer.alloc(1024 * 1024 * 10, '.') // 10MB
    const invalidAttachmentTooBigName = 'too big.txt'

    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${apiKey}`)
      .field('recipient', validApiCall.recipient)
      .field('subject', validApiCall.subject)
      .field('body', validApiCall.body)
      .field('from', validApiCall.from)
      .field('reply_to', validApiCall.reply_to)
      .attach(
        'attachments',
        invalidAttachmentTooBig,
        invalidAttachmentTooBigName
      )

    expect(res.status).toBe(413)
    expect(mockSendEmail).not.toBeCalled()
    // no need to check EmailMessageTransactional since this is rejected before db record is saved
  })

  test('Should send email with two valid attachments and metadata is saved correctly in db', async () => {
    mockSendEmail = jest
      .spyOn(EmailService, 'sendEmail')
      .mockResolvedValue('message_id')

    const validAttachment2 = Buffer.from('wassup dog')
    const validAttachment2Name = 'hey.txt'
    const validAttachment2Size = Buffer.byteLength(validAttachment2)

    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${apiKey}`)
      .field('recipient', validApiCall.recipient)
      .field('subject', validApiCall.subject)
      .field('body', validApiCall.body)
      .field('from', validApiCall.from)
      .field('reply_to', validApiCall.reply_to)
      .attach('attachments', validAttachment, validAttachmentName)
      .attach('attachments', validAttachment2, validAttachment2Name)

    expect(res.status).toBe(201)
    expect(mockSendEmail).toBeCalledTimes(1)
    const transactionalEmail = await EmailMessageTransactional.findOne({
      where: { userId: user.id.toString() },
    })
    expect(transactionalEmail).not.toBeNull()
    expect(transactionalEmail).toMatchObject({
      recipient: validApiCall.recipient,
      from: validApiCall.from,
      status: TransactionalEmailMessageStatus.Accepted,
      errorCode: null,
    })
    expect(transactionalEmail?.params).toMatchObject({
      subject: validApiCall.subject,
      body: validApiCall.body,
      from: validApiCall.from,
      reply_to: validApiCall.reply_to,
    })
    expect(transactionalEmail?.attachmentsMetadata).not.toBeNull()
    expect(transactionalEmail?.attachmentsMetadata).toHaveLength(2)
    expect(transactionalEmail?.attachmentsMetadata).toMatchObject([
      {
        fileName: validAttachmentName,
        fileSize: validAttachmentSize,
        hash: expect.stringMatching(validAttachmentHashRegex),
      },
      {
        fileName: validAttachment2Name,
        fileSize: validAttachment2Size,
        hash: expect.stringMatching(validAttachmentHashRegex),
      },
    ])
  })

  test('Email with more than two attachments should fail', async () => {
    mockSendEmail = jest.spyOn(EmailService, 'sendEmail')
    // at time of writing this test default value of FILE_ATTACHMENT_MAX_NUM is 2
    // not sure how to create a variable number of attachments + API call (probably not possible?)
    const attachment2 = Buffer.from('wassup dog')
    const attachment2Name = 'hey.txt'
    const attachment3 = Buffer.from('wassup pal')
    const attachment3Name = 'hi there.txt'
    const attachment4 = Buffer.from('hello there')
    const attachment4Name = 'hello friends.txt'
    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${apiKey}`)
      .field('recipient', validApiCall.recipient)
      .field('subject', validApiCall.subject)
      .field('body', validApiCall.body)
      .field('from', validApiCall.from)
      .field('reply_to', validApiCall.reply_to)
      .attach('attachments', validAttachment, validAttachmentName)
      .attach('attachments', attachment2, attachment2Name)
      .attach('attachments', attachment3, attachment3Name)
      .attach('attachments', attachment4, attachment4Name)

    expect(res.status).toBe(413)
    expect(mockSendEmail).not.toBeCalled()
    // no need to check EmailMessageTransactional since this is rejected before db record is saved
  })

  test('Requests should be rate limited and metadata and error code is saved correctly in db', async () => {
    mockSendEmail = jest
      .spyOn(EmailService, 'sendEmail')
      .mockResolvedValue('message_id')
    const send = (): Promise<request.Response> => {
      return request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${apiKey}`)
        .send(validApiCall)
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
      recipient: validApiCall.recipient,
      from: validApiCall.from,
      status: TransactionalEmailMessageStatus.Accepted,
      errorCode: null,
    })
    expect(firstEmail?.params).toMatchObject({
      subject: validApiCall.subject,
      body: validApiCall.body,
      from: validApiCall.from,
      reply_to: validApiCall.reply_to,
    })

    // Second request rate limited
    res = await send()
    expect(res.status).toBe(429)
    expect(mockSendEmail).not.toBeCalled()
    mockSendEmail.mockClear()
    // second email is saved in db but has error code 429
    const secondEmail = await EmailMessageTransactional.findOne({
      where: { userId: user.id.toString() },
      order: [['createdAt', 'DESC']],
    })
    expect(secondEmail).not.toBeNull()
    expect(secondEmail).toMatchObject({
      recipient: validApiCall.recipient,
      from: validApiCall.from,
      status: TransactionalEmailMessageStatus.Unsent,
      errorCode: RATE_LIMIT_ERROR_MESSAGE,
    })
    expect(secondEmail?.params).toMatchObject({
      subject: validApiCall.subject,
      body: validApiCall.body,
      from: validApiCall.from,
      reply_to: validApiCall.reply_to,
    })
  })

  test('Requests should not be rate limited after window elasped and metadata is saved correctly in db', async () => {
    mockSendEmail = jest
      .spyOn(EmailService, 'sendEmail')
      .mockResolvedValue('message_id')
    const send = (): Promise<request.Response> => {
      return request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${apiKey}`)
        .send(validApiCall)
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
      recipient: validApiCall.recipient,
      from: validApiCall.from,
      status: TransactionalEmailMessageStatus.Accepted,
      errorCode: null,
    })
    expect(firstEmail?.params).toMatchObject({
      subject: validApiCall.subject,
      body: validApiCall.body,
      from: validApiCall.from,
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
      recipient: validApiCall.recipient,
      from: validApiCall.from,
      status: TransactionalEmailMessageStatus.Unsent,
      errorCode: RATE_LIMIT_ERROR_MESSAGE,
    })
    expect(secondEmail?.params).toMatchObject({
      subject: validApiCall.subject,
      body: validApiCall.body,
      from: validApiCall.from,
      reply_to: validApiCall.reply_to,
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
      recipient: validApiCall.recipient,
      from: validApiCall.from,
      status: TransactionalEmailMessageStatus.Accepted,
      errorCode: null,
    })
    expect(thirdEmail?.params).toMatchObject({
      subject: validApiCall.subject,
      body: validApiCall.body,
      from: validApiCall.from,
      reply_to: validApiCall.reply_to,
    })
  })
})

describe(`GET ${emailTransactionalRoute}`, () => {
  const endpoint = emailTransactionalRoute
  const acceptedMessage = {
    recipient: 'recipient@gmail.com',
    from: 'Postman <donotreply@mail.postman.gov.sg>',
    params: {
      from: 'Postman <donotreply@mail.postman.gov.sg>',
      subject: 'Test',
      body: 'Test Body',
    },
    status: TransactionalEmailMessageStatus.Accepted,
  }
  const sentMessage = {
    recipient: 'recipient@agency.gov.sg',
    from: 'Postman <donotreply@mail.postman.gov.sg>',
    params: {
      from: 'Postman <donotreply@mail.postman.gov.sg>',
      subject: 'Test',
      body: 'Test Body',
    },
    status: TransactionalEmailMessageStatus.Sent,
  }
  const deliveredMessage = {
    recipient: 'recipient3@agency.gov.sg',
    from: 'Postman <donotreply@mail.postman.gov.sg>',
    params: {
      from: 'Postman <donotreply@mail.postman.gov.sg>',
      subject: 'Test',
      body: 'Test Body',
    },
    status: TransactionalEmailMessageStatus.Delivered,
  }
  test('Should return 200 with empty array when no messages are found', async () => {
    const res = await request(app)
      .get(endpoint)
      .set('Authorization', `Bearer ${apiKey}`)
    expect(res.status).toBe(200)
    expect(res.body.has_more).toBe(false)
    expect(res.body.data).toEqual([])
  })

  test('Should return 200 with descending array of messages when messages are found', async () => {
    const message = await EmailMessageTransactional.create({
      ...deliveredMessage,
      userId: user.id,
    } as unknown as EmailMessageTransactional)
    const message2 = await EmailMessageTransactional.create({
      ...acceptedMessage,
      userId: user.id,
    } as unknown as EmailMessageTransactional)
    const res = await request(app)
      .get(endpoint)
      .set('Authorization', `Bearer ${apiKey}`)
    expect(res.status).toBe(200)
    expect(res.body.has_more).toBe(false)
    expect(res.body.data).toMatchObject([
      // descending by default
      {
        id: message2.id,
        recipient: message2.recipient,
        from: message2.from,
        params: message2.params,
        status: message2.status,
      },
      {
        id: message.id,
        recipient: message.recipient,
        from: message.from,
        params: message.params,
        status: message.status,
      },
    ])
  })
  test('Should return 400 when invalid query params are provided', async () => {
    const resInvalidLimit = await request(app)
      .get(`${endpoint}?limit=invalid`)
      .set('Authorization', `Bearer ${apiKey}`)
    expect(resInvalidLimit.status).toBe(400)
    const resInvalidLimitTooLarge = await request(app)
      .get(`${endpoint}?limit=1000`)
      .set('Authorization', `Bearer ${apiKey}`)
    expect(resInvalidLimitTooLarge.status).toBe(400)
    const resInvalidOffset = await request(app)
      .get(`${endpoint}?offset=blahblah`)
      .set('Authorization', `Bearer ${apiKey}`)
    expect(resInvalidOffset.status).toBe(400)
    const resInvalidOffsetNegative = await request(app)
      .get(`${endpoint}?offset=-1`)
      .set('Authorization', `Bearer ${apiKey}`)
    expect(resInvalidOffsetNegative.status).toBe(400)
    const resInvalidStatus = await request(app)
      .get(`${endpoint}?status=blacksheep`)
      .set('Authorization', `Bearer ${apiKey}`)
    expect(resInvalidStatus.status).toBe(400)
    // repeated params should throw an error too
    const resInvalidStatus2 = await request(app)
      .get(`${endpoint}?status=sent&status=delivered`)
      .set('Authorization', `Bearer ${apiKey}`)
    expect(resInvalidStatus2.status).toBe(400)
    const resInvalidCreatedAt = await request(app)
      .get(`${endpoint}?created_at=haveyouanywool`)
      .set('Authorization', `Bearer ${apiKey}`)
    expect(resInvalidCreatedAt.status).toBe(400)
    const resInvalidCreatedAtDateFormat = await request(app)
      .get(`${endpoint}?created_at[gte]=20200101`)
      .set('Authorization', `Bearer ${apiKey}`)
    expect(resInvalidCreatedAtDateFormat.status).toBe(400)
    const resInvalidSortBy = await request(app)
      .get(`${endpoint}?sort_by=threebagsfull`)
      .set('Authorization', `Bearer ${apiKey}`)
    expect(resInvalidSortBy.status).toBe(400)
    const resInvalidSortByPrefix = await request(app)
      .get(endpoint)
      // need to use query() instead of get() for operator to be processed correctly
      .query({ sort_by: '*created_at' })
      .set('Authorization', `Bearer ${apiKey}`)
    expect(resInvalidSortByPrefix.status).toBe(400)
  })
  test('default values of limit and offset should be 10 and 0 respectively', async () => {
    for (let i = 0; i < 15; i++) {
      await EmailMessageTransactional.create({
        ...deliveredMessage,
        userId: user.id,
      } as unknown as EmailMessageTransactional)
    }
    const res = await request(app)
      .get(endpoint)
      .set('Authorization', `Bearer ${apiKey}`)
    expect(res.status).toBe(200)
    expect(res.body.has_more).toBe(true)
    expect(res.body.data.length).toBe(10)

    const res2 = await request(app)
      .get(`${endpoint}?offset=10`)
      .set('Authorization', `Bearer ${apiKey}`)
    expect(res2.status).toBe(200)
    expect(res2.body.has_more).toBe(false)
    expect(res2.body.data.length).toBe(5)

    const res3 = await request(app)
      .get(`${endpoint}?offset=15`)
      .set('Authorization', `Bearer ${apiKey}`)
    expect(res3.status).toBe(200)
    expect(res3.body.has_more).toBe(false)
    expect(res3.body.data.length).toBe(0)

    const res4 = await request(app)
      .get(`${endpoint}?limit=5`)
      .set('Authorization', `Bearer ${apiKey}`)
    expect(res4.status).toBe(200)
    expect(res4.body.has_more).toBe(true)
    expect(res4.body.data.length).toBe(5)

    const res5 = await request(app)
      .get(`${endpoint}?limit=15`)
      .set('Authorization', `Bearer ${apiKey}`)
    expect(res5.status).toBe(200)
    expect(res5.body.has_more).toBe(false)
    expect(res5.body.data.length).toBe(15)
  })

  test('status filter should work', async () => {
    for (let i = 0; i < 5; i++) {
      await EmailMessageTransactional.create({
        ...deliveredMessage,
        userId: user.id,
      } as unknown as EmailMessageTransactional)
    }
    for (let i = 0; i < 5; i++) {
      await EmailMessageTransactional.create({
        ...acceptedMessage,
        userId: user.id,
      } as unknown as EmailMessageTransactional)
    }
    for (let i = 0; i < 5; i++) {
      await EmailMessageTransactional.create({
        ...sentMessage,
        userId: user.id,
      } as unknown as EmailMessageTransactional)
    }
    const res = await request(app)
      .get(`${endpoint}?status=delivered`) // case-insensitive
      .set('Authorization', `Bearer ${apiKey}`)
    expect(res.status).toBe(200)
    expect(res.body.has_more).toBe(false)
    expect(res.body.data.length).toBe(5)
    res.body.data.forEach((message: EmailMessageTransactional) => {
      expect(message.status).toBe(TransactionalEmailMessageStatus.Delivered)
    })
    const res2 = await request(app)
      .get(`${endpoint}?status=aCcEPteD`)
      .set('Authorization', `Bearer ${apiKey}`)
    expect(res2.status).toBe(200)
    expect(res2.body.has_more).toBe(false)
    expect(res2.body.data.length).toBe(5)
    res2.body.data.forEach((message: EmailMessageTransactional) => {
      expect(message.status).toBe(TransactionalEmailMessageStatus.Accepted)
    })
    const res3 = await request(app)
      .get(`${endpoint}?status=SENT`)
      .set('Authorization', `Bearer ${apiKey}`)
    expect(res3.status).toBe(200)
    expect(res3.body.has_more).toBe(false)
    expect(res3.body.data.length).toBe(5)
    res3.body.data.forEach((message: EmailMessageTransactional) => {
      expect(message.status).toBe(TransactionalEmailMessageStatus.Sent)
    })
    // duplicate status params should throw an error
    const res4 = await request(app)
      .get(`${endpoint}?status=SENT&status=ACCEPTED`)
      .set('Authorization', `Bearer ${apiKey}`)
    expect(res4.status).toBe(400)
  })
  test('created_at filter range should work', async () => {
    const messages = []
    const now = new Date()
    for (let i = 0; i < 10; i++) {
      const message = await EmailMessageTransactional.create({
        ...deliveredMessage,
        userId: user.id,
        createdAt: new Date(now.getTime() - 100000 + i * 1000), // inserting in chronological order
      } as unknown as EmailMessageTransactional)
      messages.push(message)
    }
    const res = await request(app)
      .get(
        `${endpoint}?created_at[gte]=${messages[0].createdAt.toISOString()}&created_at[lte]=${messages[4].createdAt.toISOString()}`
      )
      .set('Authorization', `Bearer ${apiKey}`)
    expect(res.status).toBe(200)
    expect(res.body.has_more).toBe(false)
    expect(res.body.data.length).toBe(5)

    const res2 = await request(app)
      .get(
        `${endpoint}?created_at[gt]=${messages[0].createdAt.toISOString()}&created_at[lt]=${messages[4].createdAt.toISOString()}`
      )
      .set('Authorization', `Bearer ${apiKey}`)
    expect(res2.status).toBe(200)
    expect(res2.body.has_more).toBe(false)
    expect(res2.body.data.length).toBe(3)

    // repeated operators should throw an error
    const res3 = await request(app)
      .get(
        `${endpoint}?created_at[gte]=${messages[0].createdAt.toISOString()}&created_at[lte]=${messages[4].createdAt.toISOString()}&created_at[gte]=${messages[0].createdAt.toISOString()}`
      )
      .set('Authorization', `Bearer ${apiKey}`)
    expect(res3.status).toBe(400)
    // if gt and lt are used, gte and lte should be ignored
    const res4 = await request(app)
      .get(
        `${endpoint}?created_at[gt]=${messages[0].createdAt.toISOString()}&created_at[lt]=${messages[4].createdAt.toISOString()}&created_at[gte]=${messages[0].createdAt.toISOString()}`
      )
      .set('Authorization', `Bearer ${apiKey}`)
    expect(res4.status).toBe(200)
    expect(res4.body.has_more).toBe(false)
    expect(res4.body.data.length).toBe(3)
  })
  test('sort_by should work', async () => {
    const messages = []
    const now = new Date()
    for (let i = 0; i < 10; i++) {
      const message = await EmailMessageTransactional.create({
        ...deliveredMessage,
        userId: user.id,
        createdAt: new Date(now.getTime() - 100000 + i * 1000), // inserting in chronological order
      } as unknown as EmailMessageTransactional)
      messages.push(message)
    }

    const res = await request(app)
      .get(`${endpoint}?sort_by=created_at`)
      .set('Authorization', `Bearer ${apiKey}`)
    expect(res.status).toBe(200)
    expect(res.body.has_more).toBe(false)
    expect(res.body.data.length).toBe(10)
    // default descending order
    expect(res.body.data[0].id).toBe(messages[9].id)
    expect(res.body.data[9].id).toBe(messages[0].id)

    const res2 = await request(app)
      .get(endpoint)
      // need to use query() instead of get() for operator to be processed correctly
      .query({ sort_by: '+created_at' })
      .set('Authorization', `Bearer ${apiKey}`)
    expect(res2.status).toBe(200)
    expect(res2.body.has_more).toBe(false)
    expect(res2.body.data.length).toBe(10)
    expect(res2.body.data[0].id).toBe(messages[0].id)
    expect(res2.body.data[9].id).toBe(messages[9].id)

    const res3 = await request(app)
      .get(endpoint)
      // need to use query() instead of get() for operator to be processed correctly
      .query({ sort_by: '-created_at' })
      .set('Authorization', `Bearer ${apiKey}`)
    expect(res3.status).toBe(200)
    expect(res3.body.has_more).toBe(false)
    expect(res3.body.data.length).toBe(10)
    expect(res3.body.data[0].id).toBe(messages[9].id)
    expect(res3.body.data[9].id).toBe(messages[0].id)

    const res4 = await request(app)
      .get(endpoint)
      // this is basically testing for repeating sort_by params twice, e.g. endpoint?sort_by=+created_at&sort_by=created_at
      .query({ sort_by: ['created_at', '+created_at'] })
      .set('Authorization', `Bearer ${apiKey}`)
    expect(res4.status).toBe(400)
  })
  test('combination of query params should work', async () => {
    const messages = []
    const now = new Date()
    for (let i = 0; i < 15; i++) {
      // mixing up different messages
      const messageParams =
        i % 3 === 0
          ? deliveredMessage
          : i % 3 === 1
          ? sentMessage
          : acceptedMessage
      const message = await EmailMessageTransactional.create({
        ...messageParams,
        userId: user.id,
        createdAt: new Date(now.getTime() - 100000 + i * 1000), // inserting in chronological order
      } as unknown as EmailMessageTransactional)
      messages.push(message)
    }
    const res = await request(app)
      .get(
        `${endpoint}?created_at[gte]=${messages[0].createdAt.toISOString()}&created_at[lte]=${messages[4].createdAt.toISOString()}&sort_by=created_at`
      )
      .set('Authorization', `Bearer ${apiKey}`)
    expect(res.status).toBe(200)
    expect(res.body.has_more).toBe(false)
    expect(res.body.data.length).toBe(5)
    expect(res.body.data[0].id).toBe(messages[4].id)
    expect(res.body.data[4].id).toBe(messages[0].id)

    const res2 = await request(app)
      .get(endpoint)
      .query({ status: 'delivered', sort_by: '+created_at', limit: '4' })
      .set('Authorization', `Bearer ${apiKey}`)

    expect(res2.status).toBe(200)
    expect(res2.body.has_more).toBe(true)
    expect(res2.body.data.length).toBe(4)
    res2.body.data.forEach((message: EmailMessageTransactional) => {
      expect(message.status).toBe(TransactionalEmailMessageStatus.Delivered)
    })
    expect(new Date(res2.body.data[3].created_at).getTime()).toBeGreaterThan(
      // check that it is ascending
      new Date(res2.body.data[2].created_at).getTime()
    )
  })
})

describe(`GET ${emailTransactionalRoute}/:emailId`, () => {
  const endpoint = emailTransactionalRoute
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
      .get(`${endpoint}/${message.id}`)
      .set('Authorization', `Bearer ${apiKey}`)
    expect(res.status).toBe(200)
    expect(res.body).toBeDefined()
    expect(res.body.id).toBe(message.id)
  })

  test('should return 404 if the transactional email message ID not found', async () => {
    const id = 69
    const res = await request(app)
      .get(`${endpoint}/${id}`)
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
      .get(`${endpoint}/${message.id}`)
      .set('Authorization', `Bearer ${anotherApiKey}`)
    expect(res.status).toBe(404)
    expect(res.body.message).toBe(
      `Email message with ID ${message.id} not found.`
    )
  })
})
