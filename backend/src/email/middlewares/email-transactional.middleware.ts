import type { Handler, NextFunction, Request, Response } from 'express'
import expressRateLimit from 'express-rate-limit'
import RedisStore from 'rate-limit-redis'
import { RedisService } from '@core/services'
import { EmailTransactionalService } from '@email/services'
import config from '@core/config'
import { loggerWithLabel } from '@core/logger'
import { AuthService } from '@core/services/auth.service'
import {
  InvalidMessageError,
  InvalidRecipientError,
  MaliciousFileError,
  UnsupportedFileTypeError,
} from '@core/errors'
import {
  EmailMessageTransactional,
  TransactionalEmailMessageStatus,
} from '@email/models'

import crypto from 'crypto'

export interface EmailTransactionalMiddleware {
  saveMessage: Handler
  sendMessage: Handler
  rateLimit: Handler
  getById: Handler
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

    const emailMessageTransactional = await EmailMessageTransactional.create({
      userId: req.session?.user?.id,
      from,
      recipient,
      params: {
        subject,
        body,
        from,
        replyTo,
      },
      messageId: null,
      attachmentsMetadata: null,
      status: TransactionalEmailMessageStatus.Unsent,
      errorCode: null,
      sentAt: null,
      // not sure why unknown is needed to silence TS (yet other parts of the code base can just use `as Model` directly hmm)
    } as unknown as EmailMessageTransactional)
    if (!emailMessageTransactional) {
      throw new Error('Unable to create entry in email_message_tx')
    }
    if (attachments) {
      void EmailMessageTransactional.update(
        {
          attachmentsMetadata: attachments.map((a) => ({
            fileName: a.name,
            fileSize: a.size,
            hash: getAttachmentHash(a.data),
          })),
        },
        {
          where: { id: emailMessageTransactional.id },
        }
      )
    }
    req.body.emailMessageTransactionalId = emailMessageTransactional.id // for subsequent middlewares to distinguish whether this is a transactional email
    next()
  }

  function getAttachmentHash(content: Buffer): string {
    const hasher = crypto.createHash('md5')
    return hasher.update(content).digest('hex')
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
      const emailMessageTransactional = await EmailMessageTransactional.findOne(
        {
          where: { id: emailMessageTransactionalId },
        }
      )
      if (!emailMessageTransactional) {
        // practically this will never happen but adding to fulfill TypeScript
        // type-safety requirement
        throw new Error('Failed to save transactional message')
      }
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
        InvalidMessageError,
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
          errorCode: 'Error 429: Too many requests, rate limit reached',
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
  }
}
