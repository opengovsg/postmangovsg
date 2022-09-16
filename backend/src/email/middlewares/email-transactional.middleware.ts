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
import { EmailMessageTx, TransactionalEmailMessageStatus } from '@email/models'
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
    res: Response,
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
    const emailMessageTx = await EmailMessageTx.create({
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
      hasAttachment: !!attachments,
      attachmentS3Object: null,
      status: TransactionalEmailMessageStatus.Unsent,
      sentAt: null,
      errorCode: null,
      // not sure why unknown is needed to silence TS (yet other parts of the code base can just use `as Model` directly hmm)
    } as unknown as EmailMessageTx)
    if (!emailMessageTx) {
      // TODO: log error, etc.
      res.status(500).json({
        message: 'Unable to create entry in email_message_tx',
      })
      throw new Error('Unable to create entry in email_message_tx')
    }
    // attach to body for subsequent middlewares
    req.body.userEmail = userEmail
    req.body.emailMessageTxId = emailMessageTx.id
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
      emailMessageTxId, // added by saveMessage
    }: ReqBody & { userEmail: string; emailMessageTxId: number } = req.body

    try {
      await EmailTransactionalService.sendMessage({
        subject,
        body,
        from,
        recipient,
        replyTo: replyTo ?? userEmail,
        attachments,
        emailMessageTxId,
      })
      await EmailMessageTx.update(
        {
          status: TransactionalEmailMessageStatus.Accepted,
          sentAt: new Date(),
        },
        {
          where: { id: emailMessageTxId },
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
      // think we can use void here? not using return value, no need to wait
      void EmailMessageTx.update(
        {
          status: TransactionalEmailMessageStatus.RateLimitError,
          errorCode: '429',
        },
        {
          where: { id: req.body.emailMessageTxId },
        }
      )
      res.sendStatus(429)
    },
  })

  return {
    saveMessage,
    sendMessage,
    rateLimit,
  }
}
