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
import { parseFromAddress } from '@shared/utils/from-address'

export interface EmailTransactionalMiddleware {
  saveMessage: Handler
  sendMessage: Handler
  rateLimit: Handler
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
    attachments?: { data: Buffer; name: string }[]
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

    const { fromName, fromAddress } = parseFromAddress(from)
    const userEmail = (await authService.findUser(req.session?.user?.id))?.email
    const emailMessageTransactional = await EmailMessageTransactional.create({
      userEmail,
      fromName,
      fromAddress,
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
          attachmentsMetadata: [],
        },
        {
          where: { id: emailMessageTransactional.id },
        }
      )
    }
    // TODO: process attachments metadata
    req.body.userEmail = userEmail // in order to avoid a db call
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
      userEmail, // added by saveMessage; avoid unnecessary DB query
      emailMessageTransactionalId, // added by saveMessage
    }: ReqBody & {
      userEmail: string
      emailMessageTransactionalId: number
    } = req.body

    try {
      await EmailTransactionalService.sendMessage({
        subject,
        body,
        from,
        recipient,
        replyTo: replyTo ?? userEmail,
        attachments,
        emailMessageTransactionalId,
      })
      await EmailMessageTransactional.update(
        {
          status: TransactionalEmailMessageStatus.Accepted,
          sentAt: new Date(),
        },
        {
          where: { id: emailMessageTransactionalId },
        }
      )
      res.sendStatus(202)
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
  }
}
