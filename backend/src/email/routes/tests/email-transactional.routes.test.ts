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
      replyTo: validApiCall.reply_to,
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
      replyTo: user.email,
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
      recipient: validApiCall.recipient,
      from: `Hello <${user.email}>`,
      status: TransactionalEmailMessageStatus.Accepted,
      errorCode: null,
    })
    expect(transactionalEmail?.params).toMatchObject({
      subject: validApiCall.subject,
      body: validApiCall.body,
      from: `Hello <${user.email}>`,
      replyTo: user.email,
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
      replyTo: validApiCall.reply_to,
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

    expect(res.status).toBe(202)
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
      replyTo: validApiCall.reply_to,
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
      replyTo: validApiCall.reply_to,
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
      replyTo: validApiCall.reply_to,
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
      replyTo: validApiCall.reply_to,
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
      replyTo: validApiCall.reply_to,
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

    expect(res.status).toBe(202)
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
      replyTo: validApiCall.reply_to,
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
      replyTo: validApiCall.reply_to,
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
      replyTo: validApiCall.reply_to,
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
      replyTo: validApiCall.reply_to,
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
      replyTo: validApiCall.reply_to,
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
