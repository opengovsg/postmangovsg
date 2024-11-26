import request from 'supertest'
import { Op } from 'sequelize'
import { Sequelize } from 'sequelize-typescript'

import { User } from '@core/models'
import {
  CredentialService,
  FileExtensionService,
  UNSUPPORTED_FILE_TYPE_ERROR_CODE,
} from '@core/services'
import {
  INVALID_FROM_ADDRESS_ERROR_MESSAGE,
  TRANSACTIONAL_EMAIL_WINDOW,
  UNVERIFIED_FROM_ADDRESS_ERROR_MESSAGE,
} from '@email/middlewares'
import {
  EmailFromAddress,
  EmailMessageTransactional,
  EmailMessageTransactionalCc,
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
const userEmail = 'user@agency.gov.sg'

beforeEach(async () => {
  sequelize = await sequelizeLoader(process.env.JEST_WORKER_ID || '1')
  // Flush the rate limit redis database
  await new Promise((resolve) =>
    (app as any).redisService.rateLimitClient.flushdb(resolve)
  )
  user = await User.create({
    id: 1,
    email: userEmail,
    rateLimit: 1, // for ease of testing, so second API call within a second would fail
  } as User)
  const { plainTextKey } = await (
    app as any as { credentialService: CredentialService }
  ).credentialService.generateApiKey(user.id, 'test api key', [user.email])
  apiKey = plainTextKey
})

afterEach(async () => {
  jest.restoreAllMocks()
  await EmailMessageTransactional.destroy({ where: {} })
  await User.destroy({ where: {} })
  await EmailFromAddress.destroy({ where: {} })
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
    from: 'Postman <info@mail.postman.gov.sg>',
    reply_to: 'user@agency.gov.sg',
  }
  const generateRandomSmallFile = () => {
    const randomFile = Buffer.from(Math.random().toString(36).substring(2))
    return randomFile
  }
  const generateRandomFileSizeInMb = (sizeInMb: number) => {
    const randomFile = Buffer.alloc(sizeInMb * 1024 * 1024, '.')
    return randomFile
  }

  // attachment only allowed when sent from user's own email
  const validApiCallAttachment = {
    ...validApiCall,
    from: `User <${userEmail}>`,
  }
  const validAttachment = generateRandomSmallFile()
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
      .mockResolvedValue(true)
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
      .mockResolvedValue(true)

    const from = 'Hello <info@mail.postman.gov.sg>'
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
      where: { id: res.body.id },
    })
    expect(transactionalEmail).not.toBeNull()
    expect(transactionalEmail).toMatchObject({
      recipient: validApiCall.recipient,
      from: 'Hello <info@mail.postman.gov.sg>',
      status: TransactionalEmailMessageStatus.Accepted,
      errorCode: null,
    })
    expect(transactionalEmail?.params).toMatchObject({
      subject: validApiCall.subject,
      body: validApiCall.body,
      from: 'Hello <info@mail.postman.gov.sg>',
      reply_to: user.email,
    })
  })

  test('Should send a message with valid custom from address', async () => {
    const mockSendEmail = jest
      .spyOn(EmailService, 'sendEmail')
      .mockResolvedValue(true)

    await EmailFromAddress.create({
      email: user.email,
      name: 'Agency ABC',
    } as EmailFromAddress)
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
      where: { id: res.body.id },
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

  test('Should throw an error with invalid custom from address (not user email)', async () => {
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
    const transactionalEmail = await EmailMessageTransactional.findOne({
      where: { userId: user.id.toString() },
    })
    expect(transactionalEmail).not.toBeNull()
    expect(transactionalEmail).toMatchObject({
      recipient: validApiCall.recipient,
      from: 'Hello <invalid@agency.gov.sg>',
      status: TransactionalEmailMessageStatus.Unsent,
      errorCode: `Error 400: ${INVALID_FROM_ADDRESS_ERROR_MESSAGE}`,
    })
  })

  test('Should throw an error with invalid custom from address (user email not added into EmailFromAddress table)', async () => {
    mockSendEmail = jest.spyOn(EmailService, 'sendEmail')
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

    expect(res.status).toBe(400)
    expect(mockSendEmail).not.toBeCalled()
    const transactionalEmail = await EmailMessageTransactional.findOne({
      where: { userId: user.id.toString() },
    })
    expect(transactionalEmail).not.toBeNull()
    expect(transactionalEmail).toMatchObject({
      recipient: validApiCall.recipient,
      from: `Hello <${user.email}>`,
      status: TransactionalEmailMessageStatus.Unsent,
      errorCode: `Error 400: ${UNVERIFIED_FROM_ADDRESS_ERROR_MESSAGE}`,
    })
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
      .mockResolvedValue(true)
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
        messageId: (
          transactionalEmail as EmailMessageTransactional
        ).id.toString(),
        attachments: undefined,
      },
      { disableTracking: false, extraSmtpHeaders: { isTransactional: true } }
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
    const body = 'a'.repeat(1024 * 1024 * 2) // 2MB
    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${apiKey}`)
      .send({
        ...validApiCall,
        body,
      })
    // note: in practice, size of payload is limited by size specified in backend/.platform/nginx/conf.d/client_max_body_size.conf
    expect(res.status).toBe(400)
    expect(res.body).toStrictEqual({
      code: 'api_validation',
      message:
        'body is a required string whose size must be less than or equal to 1MB in UTF-8 encoding',
    })
    expect(mockSendEmail).not.toBeCalled()
  })

  test('Should throw 400 error if body size is too large (URL encoded payload)', async () => {
    mockSendEmail = jest.spyOn(EmailService, 'sendEmail')
    const body = 'a'.repeat(1024 * 1024 * 5) // 5MB
    const res = await request(app)
      .post(endpoint)
      .type('form')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({
        ...validApiCall,
        body,
      })
    expect(res.status).toBe(400)
  })

  test('Should throw 413 error if body size is wayy too large (URL encoded payload)', async () => {
    mockSendEmail = jest.spyOn(EmailService, 'sendEmail')
    const body = 'a'.repeat(1024 * 1024 * 2) // 15MB
    const res = await request(app)
      .post(endpoint)
      .type('form')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({
        ...validApiCall,
        body,
      })
    // note: in practice, size of payload is limited by size specified in backend/.platform/nginx/conf.d/client_max_body_size.conf
    expect(res.status).toBe(400)
    expect(res.body).toStrictEqual({
      code: 'api_validation',
      message:
        'body is a required string whose size must be less than or equal to 1MB in UTF-8 encoding',
    })
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
    // note: in practice, size of payload is limited by size specified in backend/.platform/nginx/conf.d/client_max_body_size.conf
    expect(mockSendEmail).not.toBeCalled()
  })

  test('Show throw 403 error is user is sending attachment from default email address', async () => {
    mockSendEmail = jest.spyOn(EmailService, 'sendEmail')
    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${apiKey}`)
      .field('recipient', validApiCallAttachment.recipient)
      .field('subject', validApiCallAttachment.subject)
      .field('body', validApiCallAttachment.body)
      .field('from', 'Postman <info@mail.postman.gov.sg>')
      .field('reply_to', validApiCallAttachment.reply_to)
      .attach('attachments', validAttachment, validAttachmentName)
    expect(res.status).toBe(403)
    expect(mockSendEmail).not.toBeCalled()
  })

  test('Should throw an error if file type of attachment is not supported and correct error is saved in db', async () => {
    mockSendEmail = jest.spyOn(EmailService, 'sendEmail')
    // not actually an invalid file type; FileExtensionService checks magic number
    const invalidFileTypeAttachment = generateRandomFileSizeInMb(1)
    const invalidFileTypeAttachmentName = 'invalid.exe'
    // instead, we just mock the service to return false
    const mockFileTypeCheck = jest
      .spyOn(FileExtensionService, 'hasAllowedExtensions')
      .mockResolvedValue(false)

    await EmailFromAddress.create({
      email: user.email,
      name: 'Agency ABC',
    } as EmailFromAddress)

    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${apiKey}`)
      .field('recipient', validApiCallAttachment.recipient)
      .field('subject', validApiCallAttachment.subject)
      .field('body', validApiCallAttachment.body)
      .field('from', validApiCallAttachment.from)
      .field('reply_to', validApiCallAttachment.reply_to)
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
      recipient: validApiCallAttachment.recipient,
      from: validApiCallAttachment.from,
      status: TransactionalEmailMessageStatus.Unsent,
    })
    expect(transactionalEmail?.params).toMatchObject({
      from: validApiCallAttachment.from,
      reply_to: validApiCallAttachment.reply_to,
    })
    expect(transactionalEmail?.errorCode).toBe(UNSUPPORTED_FILE_TYPE_ERROR_CODE)
  })

  test('Should throw an error if recipient is blacklisted and correct error is saved in db', async () => {
    mockSendEmail = jest.spyOn(EmailService, 'sendEmail')
    // not actually a blacklisted recipient
    const blacklistedRecipient = 'blacklisted@baddomain.com'
    // instead, mock to return recipient as blacklisted
    const mockIsBlacklisted = jest
      .spyOn(EmailService, 'findBlacklistedRecipients')
      .mockResolvedValue(['blacklisted@baddomain.com'])
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
      .mockResolvedValue(true)

    await EmailFromAddress.create({
      email: user.email,
      name: 'Agency ABC',
    } as EmailFromAddress)

    // request.send() cannot be used with file attachments
    // substitute form values with request.field(). refer to
    // https://visionmedia.github.io/superagent/#multipart-requests
    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${apiKey}`)
      .field('recipient', validApiCallAttachment.recipient)
      .field('subject', validApiCallAttachment.subject)
      .field('body', validApiCallAttachment.body)
      .field('from', validApiCallAttachment.from)
      .field('reply_to', validApiCallAttachment.reply_to)
      .attach('attachments', validAttachment, validAttachmentName)

    expect(res.status).toBe(201)
    expect(res.body).toBeDefined()
    expect(res.body.attachments_metadata).toBeDefined()
    expect(mockSendEmail).toBeCalledTimes(1)
    expect(mockSendEmail).toBeCalledWith(
      {
        body: validApiCallAttachment.body,
        from: validApiCallAttachment.from,
        replyTo: validApiCallAttachment.reply_to,
        subject: validApiCallAttachment.subject,
        recipients: [validApiCallAttachment.recipient],
        messageId: expect.any(String),
        attachments: [
          {
            content: expect.any(Buffer),
            filename: validAttachmentName,
          },
        ],
      },
      {
        disableTracking: false,
        extraSmtpHeaders: { isTransactional: true },
      }
    )
    const transactionalEmail = await EmailMessageTransactional.findOne({
      where: { userId: user.id.toString() },
    })
    expect(transactionalEmail).not.toBeNull()
    expect(transactionalEmail).toMatchObject({
      recipient: validApiCallAttachment.recipient,
      from: validApiCallAttachment.from,
      status: TransactionalEmailMessageStatus.Accepted,
      errorCode: null,
    })
    expect(transactionalEmail?.params).toMatchObject({
      subject: validApiCallAttachment.subject,
      body: validApiCallAttachment.body,
      from: validApiCallAttachment.from,
      reply_to: validApiCallAttachment.reply_to,
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

  test('Should send email with a valid attachment and attachment metadata is saved correctly in db (with content id tag)', async () => {
    mockSendEmail = jest
      .spyOn(EmailService, 'sendEmail')
      .mockResolvedValue(true)

    await EmailFromAddress.create({
      email: user.email,
      name: 'Agency ABC',
    } as EmailFromAddress)

    // request.send() cannot be used with file attachments
    // substitute form values with request.field(). refer to
    // https://visionmedia.github.io/superagent/#multipart-requests
    const bodyWithContentIdTag =
      validApiCallAttachment.body + '<img src="cid:0">'
    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${apiKey}`)
      .field('recipient', validApiCallAttachment.recipient)
      .field('subject', validApiCallAttachment.subject)
      .field('body', bodyWithContentIdTag)
      .field('from', validApiCallAttachment.from)
      .field('reply_to', validApiCallAttachment.reply_to)
      .attach('attachments', validAttachment, validAttachmentName)

    expect(res.status).toBe(201)
    expect(res.body).toBeDefined()
    expect(res.body.attachments_metadata).toBeDefined()
    expect(mockSendEmail).toBeCalledTimes(1)
    expect(mockSendEmail).toBeCalledWith(
      {
        body: bodyWithContentIdTag,
        from: validApiCallAttachment.from,
        replyTo: validApiCallAttachment.reply_to,
        subject: validApiCallAttachment.subject,
        recipients: [validApiCallAttachment.recipient],
        messageId: expect.any(String),
        attachments: [
          {
            cid: '0',
            content: expect.any(Buffer),
            filename: validAttachmentName,
          },
        ],
      },
      {
        disableTracking: false,
        extraSmtpHeaders: { isTransactional: true },
      }
    )
    const transactionalEmail = await EmailMessageTransactional.findOne({
      where: { userId: user.id.toString() },
    })
    expect(transactionalEmail).not.toBeNull()
    expect(transactionalEmail).toMatchObject({
      recipient: validApiCallAttachment.recipient,
      from: validApiCallAttachment.from,
      status: TransactionalEmailMessageStatus.Accepted,
      errorCode: null,
    })
    expect(transactionalEmail?.params).toMatchObject({
      subject: validApiCallAttachment.subject,
      body: bodyWithContentIdTag,
      from: validApiCallAttachment.from,
      reply_to: validApiCallAttachment.reply_to,
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

  test('Email with attachment that exceeds size limit should fail', async () => {
    mockSendEmail = jest.spyOn(EmailService, 'sendEmail')
    const invalidAttachmentTooBig = generateRandomFileSizeInMb(10)
    const invalidAttachmentTooBigName = 'too big.txt'

    await EmailFromAddress.create({
      email: user.email,
      name: 'Agency ABC',
    } as EmailFromAddress)

    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${apiKey}`)
      .field('recipient', validApiCallAttachment.recipient)
      .field('subject', validApiCallAttachment.subject)
      .field('body', validApiCallAttachment.body)
      .field('from', validApiCallAttachment.from)
      .field('reply_to', validApiCallAttachment.reply_to)
      .attach(
        'attachments',
        invalidAttachmentTooBig,
        invalidAttachmentTooBigName
      )

    expect(res.status).toBe(413)
    expect(mockSendEmail).not.toBeCalled()
    // no need to check EmailMessageTransactional since this is rejected before db record is saved
  })
  test('Email with more than 10MB cumulative attachments should fail', async () => {
    mockSendEmail = jest.spyOn(EmailService, 'sendEmail')
    await EmailFromAddress.create({
      email: user.email,
      name: 'Agency ABC',
    } as EmailFromAddress)
    const onepointnineMbAttachment = generateRandomFileSizeInMb(1.9)

    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${apiKey}`)
      .field('recipient', validApiCallAttachment.recipient)
      .field('subject', validApiCallAttachment.subject)
      .field('body', validApiCallAttachment.body)
      .field('from', validApiCallAttachment.from)
      .field('reply_to', validApiCallAttachment.reply_to)
      .attach('attachments', onepointnineMbAttachment, 'attachment1')
      .attach('attachments', onepointnineMbAttachment, 'attachment2')
      .attach('attachments', onepointnineMbAttachment, 'attachment3')
      .attach('attachments', onepointnineMbAttachment, 'attachment4')
      .attach('attachments', onepointnineMbAttachment, 'attachment5')
      .attach('attachments', onepointnineMbAttachment, 'attachment6')

    expect(res.status).toBe(413)
    expect(mockSendEmail).not.toBeCalled()
    // no need to check EmailMessageTransactional since this is rejected before db record is saved
  })

  test('Should send email with two valid attachments and metadata is saved correctly in db', async () => {
    mockSendEmail = jest
      .spyOn(EmailService, 'sendEmail')
      .mockResolvedValue(true)

    await EmailFromAddress.create({
      email: user.email,
      name: 'Agency ABC',
    } as EmailFromAddress)

    const validAttachment2 = generateRandomSmallFile()
    const validAttachment2Name = 'hey.txt'
    const validAttachment2Size = Buffer.byteLength(validAttachment2)

    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${apiKey}`)
      .field('recipient', validApiCallAttachment.recipient)
      .field('subject', validApiCallAttachment.subject)
      .field('body', validApiCallAttachment.body)
      .field('from', validApiCallAttachment.from)
      .field('reply_to', validApiCallAttachment.reply_to)
      .attach('attachments', validAttachment, validAttachmentName)
      .attach('attachments', validAttachment2, validAttachment2Name)

    expect(res.status).toBe(201)
    expect(mockSendEmail).toBeCalledTimes(1)
    expect(mockSendEmail).toBeCalledWith(
      {
        body: validApiCallAttachment.body,
        from: validApiCallAttachment.from,
        replyTo: validApiCallAttachment.reply_to,
        subject: validApiCallAttachment.subject,
        recipients: [validApiCallAttachment.recipient],
        messageId: expect.any(String),
        attachments: [
          {
            content: expect.any(Buffer),
            filename: validAttachmentName,
          },
          {
            content: expect.any(Buffer),
            filename: validAttachment2Name,
          },
        ],
      },
      {
        disableTracking: false,
        extraSmtpHeaders: { isTransactional: true },
      }
    )
    const transactionalEmail = await EmailMessageTransactional.findOne({
      where: { userId: user.id.toString() },
    })
    expect(transactionalEmail).not.toBeNull()
    expect(transactionalEmail).toMatchObject({
      recipient: validApiCallAttachment.recipient,
      from: validApiCallAttachment.from,
      status: TransactionalEmailMessageStatus.Accepted,
      errorCode: null,
    })
    expect(transactionalEmail?.params).toMatchObject({
      subject: validApiCallAttachment.subject,
      body: validApiCallAttachment.body,
      from: validApiCallAttachment.from,
      reply_to: validApiCallAttachment.reply_to,
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

  const ccValidTests = [
    ['cc-recipient@agency.gov.sg'],
    ['cc-recipient@agency.gov.sg', 'cc-recipient-2@agency.gov.sg'],
    JSON.stringify(['cc-recipient@agency.gov.sg']),
    JSON.stringify([
      'cc-recipient@agency.gov.sg',
      'cc-recipient-2@agency.gov.sg',
    ]),
  ]
  test.each(ccValidTests)(
    'Should send email with cc from valid array or stringified array - JSON payload',
    async (cc) => {
      mockSendEmail = jest
        .spyOn(EmailService, 'sendEmail')
        .mockResolvedValue(true)
      const res = await request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${apiKey}`)
        .send({
          ...validApiCall,
          cc,
          reply_to: user.email,
        })

      const arrayToCheck = Array.isArray(cc) ? cc : JSON.parse(cc)

      expect(res.status).toBe(201)
      expect(res.body.cc.sort()).toStrictEqual(arrayToCheck.sort())
      expect(mockSendEmail).toBeCalledTimes(1)
      const transactionalEmail = await EmailMessageTransactional.findOne({
        where: { id: res.body.id },
      })
      expect(transactionalEmail).not.toBeNull()
      expect(transactionalEmail).toMatchObject({
        recipient: validApiCall.recipient,
        from: validApiCall.from,
        status: TransactionalEmailMessageStatus.Accepted,
        errorCode: null,
      })
    }
  )

  test.each(ccValidTests)(
    'Should send email with cc from valid array or stringified array - form-data',
    async (cc) => {
      mockSendEmail = jest
        .spyOn(EmailService, 'sendEmail')
        .mockResolvedValue(true)
      // in the case where single cc is sent, stringify the cc list
      const ccSend =
        Array.isArray(cc) && cc.length === 1 ? JSON.stringify(cc) : cc

      const res = await request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${apiKey}`)
        .field('recipient', validApiCall.recipient)
        .field('subject', validApiCall.subject)
        .field('body', validApiCall.body)
        .field('from', 'Postman <info@mail.postman.gov.sg>')
        .field('reply_to', validApiCall.reply_to)
        .field('cc', ccSend)

      const arrayToCheck = Array.isArray(cc) ? cc : JSON.parse(cc)

      expect(res.status).toBe(201)
      expect(res.body.cc.sort()).toStrictEqual(arrayToCheck.sort())
      expect(mockSendEmail).toBeCalledTimes(1)
      const transactionalEmail = await EmailMessageTransactional.findOne({
        where: { id: res.body.id },
        include: [
          {
            model: EmailMessageTransactionalCc,
            attributes: ['email', 'ccType'],
            where: { errorCode: { [Op.eq]: null } },
            required: false,
          },
        ],
      })

      expect(transactionalEmail).not.toBeNull()
      expect(transactionalEmail).toMatchObject({
        recipient: validApiCall.recipient,
        from: validApiCall.from,
        status: TransactionalEmailMessageStatus.Accepted,
        errorCode: null,
      })
      const transactionalCcEmails =
        transactionalEmail?.emailMessageTransactionalCc.map(
          (item) => item.email
        )
      expect(transactionalCcEmails?.sort()).toStrictEqual(arrayToCheck.sort())
    }
  )

  const ccInvalidTests = [
    {
      cc: 'cc-recipient@agency.gov.sg',
      errMsg:
        '"cc" failed custom validation because cc must be a valid array or stringified array.',
    },
    {
      cc: JSON.stringify('cc-recipient@agency.gov.sg'),
      errMsg:
        '"cc" failed custom validation because cc must be a valid stringified array',
    },
    {
      cc: JSON.stringify({ key: 'cc', email: 'cc-recipient@agency.gov.sg' }),
      errMsg:
        '"cc" failed custom validation because cc must be a valid stringified array',
    },
  ]
  test.each(ccInvalidTests)(
    'Should throw api validation error if cc is not valid array or stringified array - JSON payload',
    async ({ cc, errMsg }) => {
      mockSendEmail = jest.spyOn(EmailService, 'sendEmail')

      const res = await request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${apiKey}`)
        .send({
          ...validApiCall,
          cc,
          reply_to: user.email,
        })

      expect(res.status).toBe(400)
      expect(mockSendEmail).not.toBeCalled()

      expect(res.body).toStrictEqual({
        code: 'api_validation',
        message: errMsg,
      })
    }
  )

  test.each(ccInvalidTests)(
    'Should throw api validation error if cc is not valid array or stringified array - form-data',
    async ({ cc, errMsg }) => {
      mockSendEmail = jest.spyOn(EmailService, 'sendEmail')

      const res = await request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${apiKey}`)
        .field('recipient', validApiCall.recipient)
        .field('subject', validApiCall.subject)
        .field('body', validApiCall.body)
        .field('from', 'Postman <info@mail.postman.gov.sg>')
        .field('reply_to', validApiCall.reply_to)
        .field('cc', cc)

      expect(res.status).toBe(400)
      expect(mockSendEmail).not.toBeCalled()

      expect(res.body).toStrictEqual({
        code: 'api_validation',
        message: errMsg,
      })
    }
  )

  test('Requests should be rate limited and metadata and error code is saved correctly in db', async () => {
    mockSendEmail = jest
      .spyOn(EmailService, 'sendEmail')
      .mockResolvedValue(true)
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
  })

  test('Requests should not be rate limited after window elasped and metadata is saved correctly in db', async () => {
    mockSendEmail = jest
      .spyOn(EmailService, 'sendEmail')
      .mockResolvedValue(true)
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
    // Third request passes after 1s
    await new Promise((resolve) =>
      setTimeout(resolve, TRANSACTIONAL_EMAIL_WINDOW * 1000)
    )
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
    from: 'Postman <info@mail.postman.gov.sg>',
    params: {
      from: 'Postman <info@mail.postman.gov.sg>',
      subject: 'Test',
      body: 'Test Body',
    },
    status: TransactionalEmailMessageStatus.Accepted,
  }
  const sentMessage = {
    recipient: 'recipient@agency.gov.sg',
    from: 'Postman <info@mail.postman.gov.sg>',
    params: {
      from: 'Postman <info@mail.postman.gov.sg>',
      subject: 'Test',
      body: 'Test Body',
    },
    status: TransactionalEmailMessageStatus.Sent,
  }
  const deliveredMessage = {
    recipient: 'recipient3@agency.gov.sg',
    from: 'Postman <info@mail.postman.gov.sg>',
    params: {
      from: 'Postman <info@mail.postman.gov.sg>',
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
      .get(`${endpoint}?limit=1001`)
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
      from: 'Postman <info@mail.postman.gov.sg>',
      params: {
        from: 'Postman <info@mail.postman.gov.sg>',
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
    const { plainTextKey: anotherApiKey } = await (
      app as any as { credentialService: CredentialService }
    ).credentialService.generateApiKey(anotherUser.id, 'another test api key', [
      anotherUser.email,
    ])
    const message = await EmailMessageTransactional.create({
      userId: user.id,
      recipient: 'recipient@agency.gov.sg',
      from: 'Postman <info@mail.postman.gov.sg>',
      params: {
        from: 'Postman <info@mail.postman.gov.sg>',
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
