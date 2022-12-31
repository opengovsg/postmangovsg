import type { Handler, NextFunction, Request, Response } from 'express'
import expressRateLimit from 'express-rate-limit'
import RedisStore from 'rate-limit-redis'
import { RedisService } from '@core/services'
import { EmailTransactionalService } from '@email/services'
import config from '@core/config'
import { loggerWithLabel } from '@core/logger'
import { AuthService } from '@core/services/auth.service'
import {
  MessageError,
  InvalidRecipientError,
  MaliciousFileError,
  UnsupportedFileTypeError,
} from '@core/errors'
import {
  EmailMessageTransactional,
  TransactionalEmailMessageStatus,
} from '@email/models'

import crypto from 'crypto'
import {
  Ordering,
  TimestampFilter,
  TransactionalEmailSortField,
} from '@core/constants'

export interface EmailTransactionalMiddleware {
  saveMessage: Handler
  sendMessage: Handler
  rateLimit: Handler
  getById: Handler
  listMessages: Handler
}

export const RATE_LIMIT_ERROR_MESSAGE =
  'Error 429: Too many requests, rate limit reached'

const getAttachmentHash = (content: Buffer): string => {
  const hash = crypto.createHash('md5')
  return hash.update(content).digest('hex')
}

export const InitEmailTransactionalMiddleware = (
  redisService: RedisService,
  authService: AuthService
): EmailTransactionalMiddleware => {
  const logger = loggerWithLabel(module)

  interface ReqBody {
    subject: string
    body: string
    from: string
    recipient: string
    reply_to: string
    attachments?: { data: Buffer; name: string; size: number }[]
  }

  function convertMessageModelToResponse(message: EmailMessageTransactional) {
    return {
      id: message.id,
      from: message.from,
      recipient: message.recipient,
      params: message.params,
      attachments_metadata: message.attachmentsMetadata,
      status: message.status,
      error_code: message.errorCode,
      error_sub_type: message.errorSubType,
      accepted_at: message.acceptedAt?.toISOString() || null,
      sent_at: message.sentAt?.toISOString() || null,
      delivered_at: message.deliveredAt?.toISOString() || null,
      opened_at: message.openedAt?.toISOString() || null,
      created_at: message.createdAt.toISOString(),
      updated_at: message.updatedAt.toISOString(),
    }
  }

  async function saveMessage(
    req: Request,
    _: Response,
    next: NextFunction
  ): Promise<void> {
    const action = 'saveMessage'
    logger.info({ message: 'Saving email', action })
    const {
      subject,
      body,
      from,
      recipient,
      reply_to: replyTo,
      attachments,
    }: ReqBody = req.body

    const attachmentsMetadata = attachments
      ? attachments.map((a) => ({
          fileName: a.name,
          fileSize: a.size,
          hash: getAttachmentHash(a.data),
        }))
      : null

    const emailMessageTransactional = await EmailMessageTransactional.create({
      userId: req.session?.user?.id,
      from,
      recipient,
      params: {
        subject,
        body,
        from,
        reply_to: replyTo,
      },
      messageId: null,
      attachmentsMetadata,
      status: TransactionalEmailMessageStatus.Unsent,
      errorCode: null,
      sentAt: null,
      // not sure why unknown is needed to silence TS (yet other parts of the code base can just use `as Model` directly hmm)
    } as unknown as EmailMessageTransactional)
    req.body.emailMessageTransactionalId = emailMessageTransactional.id // for subsequent middlewares to distinguish whether this is a transactional email
    next()
  }

  async function sendMessage(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const action = 'sendMessage'
    logger.info({ message: 'Sending email', action })
    const {
      subject,
      body,
      from,
      recipient,
      reply_to: replyTo,
      attachments,
      emailMessageTransactionalId, // added by saveMessage
    }: ReqBody & {
      emailMessageTransactionalId: number
    } = req.body

    try {
      const emailMessageTransactional =
        await EmailMessageTransactional.findByPk(emailMessageTransactionalId)
      if (!emailMessageTransactional) {
        // practically this will never happen but adding to fulfill TypeScript
        // type-safety requirement
        throw new Error('Unable to find entry in email_messages_transactional')
      }
      await EmailTransactionalService.sendMessage({
        subject,
        body,
        from,
        recipient,
        replyTo:
          replyTo ?? (await authService.findUser(req.session?.user?.id))?.email,
        attachments,
        emailMessageTransactionalId,
      })
      emailMessageTransactional.set(
        'status',
        TransactionalEmailMessageStatus.Accepted
      )
      emailMessageTransactional.set('acceptedAt', new Date())
      await emailMessageTransactional.save()

      res
        .status(201)
        .json(convertMessageModelToResponse(emailMessageTransactional))
      return
    } catch (error) {
      logger.error({
        message: 'Failed to send email',
        action,
        error,
      })

      const BAD_REQUEST_ERRORS = [
        MessageError,
        InvalidRecipientError,
        MaliciousFileError,
        UnsupportedFileTypeError,
      ]
      if (BAD_REQUEST_ERRORS.some((errType) => error instanceof errType)) {
        res.status(400).json({ message: (error as Error).message })
        return
      }
      next(error)
    }
  }

  async function getById(req: Request, res: Response): Promise<void> {
    const { emailId } = req.params
    const message = await EmailMessageTransactional.findOne({
      where: { id: emailId, userId: req.session?.user?.id.toString() },
    })
    if (!message) {
      res
        .status(404)
        .json({ message: `Email message with ID ${emailId} not found.` })
      return
    }

    res.status(200).json(convertMessageModelToResponse(message))
  }

  async function listMessages(req: Request, res: Response): Promise<void> {
    // validation from Joi doesn't carry over into type safety here
    // following code transforms query params into type-safe arguments for EmailTransactionalService
    const { limit, offset, status, created_at, sort_by } = req.query
    const userId: string = req.session?.user?.id.toString() // id is number in session; convert to string for tests to pass (weird)
    const filter = created_at ? { createdAt: created_at } : undefined
    const sortBy = sort_by?.toString().replace(/[+-]/, '')
    const orderBy = sort_by?.toString().includes('+')
      ? Ordering.ASC
      : Ordering.DESC // default to descending order even without '-' prefix
    const { hasMore, messages } = await EmailTransactionalService.listMessages({
      userId,
      limit: +(limit as string),
      offset: +(offset as string),
      sortBy: sortBy as TransactionalEmailSortField,
      orderBy,
      status: status as TransactionalEmailMessageStatus,
      filterByTimestamp: filter as TimestampFilter,
    })
    res.status(200).json({
      has_more: hasMore,
      data: messages.map(convertMessageModelToResponse),
    })
  }

  const rateLimit = expressRateLimit({
    store: new RedisStore({
      prefix: 'transactionalEmail:',
      client: redisService.rateLimitClient,
      expiry: config.get('transactionalEmail.window'),
    }),
    keyGenerator: (req: Request) => req?.session?.user.id,
    windowMs: config.get('transactionalEmail.window') * 1000,
    max: config.get('transactionalEmail.rate'),
    draft_polli_ratelimit_headers: true,
    message: {
      status: 429,
      message: 'Too many requests. Please try again later.',
    },
    handler: (req: Request, res: Response) => {
      logger.warn({
        message: 'Rate limited request to send transactional email',
        userId: req?.session?.user.id,
      })
      void EmailMessageTransactional.update(
        {
          errorCode: RATE_LIMIT_ERROR_MESSAGE,
        },
        {
          where: { id: req.body.emailMessageTransactionalId },
        }
      )
      res
        .status(429)
        .json({ message: 'Too many requests. Please try again later.' })
    },
  })

  return {
    saveMessage,
    sendMessage,
    rateLimit,
    getById,
    listMessages,
  }
}
