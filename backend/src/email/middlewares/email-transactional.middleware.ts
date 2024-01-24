import type { Handler, NextFunction, Request, Response } from 'express'
import expressRateLimit from 'express-rate-limit'
import RedisStore from 'rate-limit-redis'
import { RedisService } from '@core/services'
import {
  BLACKLISTED_RECIPIENT_ERROR_CODE,
  EmailService,
  EmailTransactionalService,
} from '@email/services'
import { loggerWithLabel } from '@core/logger'
import { AuthService } from '@core/services/auth.service'
import {
  MessageError,
  InvalidRecipientError,
  UnsupportedFileTypeError,
} from '@core/errors'
import {
  CcType,
  EmailMessageTransactional,
  EmailMessageTransactionalCc,
  TransactionalEmailClassification,
  TransactionalEmailMessageStatus,
} from '@email/models'

import {
  Ordering,
  TimestampFilter,
  TransactionalEmailSortField,
} from '@core/constants'
import {
  ApiInvalidTemplateError,
  ApiNotFoundError,
  ApiRateLimitError,
  ApiTooManyRecipientsError,
} from '@core/errors/rest-api.errors'
import { UploadedFile } from 'express-fileupload'
import { Op } from 'sequelize'

export interface EmailTransactionalMiddleware {
  saveMessage: Handler
  sendMessage: Handler
  rateLimit: Handler
  getById: Handler
  listMessages: Handler
  checkCcLimit: Handler
}

export const RATE_LIMIT_ERROR_MESSAGE =
  'Error 429: Too many requests, rate limit reached'

export const TRANSACTIONAL_EMAIL_WINDOW = 1 // in seconds

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
    reply_to?: string
    attachments?: UploadedFile[]
    classification?: TransactionalEmailClassification
    tag?: string
    cc?: string[]
    bcc?: string[]
    disable_tracking?: boolean
  }
  type ReqBodyWithId = ReqBody & { emailMessageTransactionalId: string }

  function convertMessageModelToResponse(
    message: EmailMessageTransactional,
    excludeParams = false
  ) {
    let cc: string[] = []
    let bcc: string[] = []
    if (message.emailMessageTransactionalCc) {
      cc = message.emailMessageTransactionalCc
        .filter((m) => m.ccType === CcType.Cc)
        .map((m) => m.email)
      bcc = message.emailMessageTransactionalCc
        .filter((m) => m.ccType === CcType.Bcc)
        .map((m) => m.email)
    }

    return {
      id: message.id,
      from: message.from,
      recipient: message.recipient,
      params: excludeParams ? undefined : message.params,
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
      classification: message.classification,
      tag: message.tag,
      cc,
      bcc,
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
      classification,
      tag,
      cc,
      bcc,
      // use of as is safe because of validation by Joi; see email-transactional.routes.ts
    } = req.body as ReqBody

    const attachmentsMetadata = attachments
      ? attachments.map((a) => ({
          fileName: a.name,
          fileSize: a.size,
          hash: a.md5,
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
      attachmentsMetadata,
      status: TransactionalEmailMessageStatus.Unsent,
      errorCode: null,
      sentAt: null,
      classification,
      tag,
      // not sure why unknown is needed to silence TS (yet other parts of the code base can just use `as Model` directly hmm)
    } as unknown as EmailMessageTransactional)

    // save cc and bcc
    let transactionalCcEmails: EmailMessageTransactionalCc[] = []

    transactionalCcEmails = transactionalCcEmails.concat(
      cc
        ? cc.map(
            (c) =>
              ({
                emailMessageTransactionalId: emailMessageTransactional.id,
                email: c,
                ccType: CcType.Cc,
              } as EmailMessageTransactionalCc)
          )
        : []
    )

    transactionalCcEmails = transactionalCcEmails.concat(
      bcc
        ? bcc.map(
            (c) =>
              ({
                emailMessageTransactionalId: emailMessageTransactional.id,
                email: c,
                ccType: CcType.Bcc,
              } as EmailMessageTransactionalCc)
          )
        : []
    )

    if (transactionalCcEmails && transactionalCcEmails.length > 0) {
      await EmailMessageTransactionalCc.bulkCreate(transactionalCcEmails)
    }

    // insert id into req.body so that subsequent middlewares can use it
    req.body.emailMessageTransactionalId = emailMessageTransactional.id
    next()
  }

  async function sendMessage(
    req: Request<unknown, unknown, ReqBodyWithId>,
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
      cc,
      bcc,
      emailMessageTransactionalId, // added by saveMessage middleware
      disable_tracking: disableTracking,
    } = req.body

    try {
      const emailMessageTransactional =
        await EmailMessageTransactional.findByPk(emailMessageTransactionalId, {
          include: [
            {
              model: EmailMessageTransactionalCc,
              attributes: ['email', 'ccType'],
              required: false,
            },
          ],
        })
      if (!emailMessageTransactional) {
        // practically this will never happen unless sendMessage is called before saveMessage
        throw new ApiNotFoundError(
          'Unable to find entry in email_messages_transactional'
        )
      }
      const recipientList = [recipient].concat(cc ?? [], bcc ?? [])

      const blacklistedRecipients =
        await EmailService.findBlacklistedRecipients(recipientList)
      const isMainRecipientBlacklisted =
        blacklistedRecipients.includes(recipient)
      if (isMainRecipientBlacklisted) {
        void EmailMessageTransactional.update(
          {
            errorCode: BLACKLISTED_RECIPIENT_ERROR_CODE,
          },
          {
            where: { id: emailMessageTransactionalId },
          }
        )
        throw new InvalidRecipientError('Recipient email is blacklisted')
      }
      void EmailMessageTransactionalCc.update(
        {
          errorCode: BLACKLISTED_RECIPIENT_ERROR_CODE,
        },
        {
          where: {
            emailMessageTransactionalId,
            email: { [Op.in]: blacklistedRecipients },
          },
        }
      )

      await EmailTransactionalService.sendMessage({
        subject,
        body,
        from,
        recipient,
        replyTo:
          replyTo ?? (await authService.findUser(req.session?.user?.id))?.email,
        attachments,
        cc:
          cc && cc.length > 0
            ? cc.filter((c) => !blacklistedRecipients.includes(c))
            : undefined,
        bcc:
          bcc && bcc.length > 0
            ? bcc.filter((c) => !blacklistedRecipients.includes(c))
            : undefined,
        emailMessageTransactionalId,
        disableTracking,
      })
      emailMessageTransactional.set(
        'status',
        TransactionalEmailMessageStatus.Accepted
      )
      emailMessageTransactional.set('acceptedAt', new Date())
      await emailMessageTransactional.save()

      // only return non-blacklisted email in cc and bcc
      emailMessageTransactional.emailMessageTransactionalCc =
        emailMessageTransactional.emailMessageTransactionalCc.filter(
          (m) => !blacklistedRecipients?.includes(m.email)
        )
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
        UnsupportedFileTypeError,
      ]
      if (BAD_REQUEST_ERRORS.some((errType) => error instanceof errType)) {
        throw new ApiInvalidTemplateError((error as Error).message)
      }
      next(error)
    }
  }

  async function getById(req: Request, res: Response): Promise<Response> {
    const { emailId } = req.params
    const message = await EmailMessageTransactional.findOne({
      where: { id: emailId, userId: req.session?.user?.id.toString() },
      include: [
        {
          model: EmailMessageTransactionalCc,
          attributes: ['email', 'ccType'],
          where: { errorCode: { [Op.eq]: null } },
          required: false,
        },
      ],
    })
    if (!message) {
      throw new ApiNotFoundError(`Email message with ID ${emailId} not found.`)
    }

    return res.status(200).json(convertMessageModelToResponse(message))
  }

  async function listMessages(req: Request, res: Response): Promise<void> {
    // validation from Joi doesn't carry over into type safety here
    // following code transforms query params into type-safe arguments for EmailTransactionalService
    const { limit, offset, status, created_at, sort_by, tag, exclude_params } =
      req.query
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
      tag: tag as string,
    })
    logger.warn({
      message: 'messagesmessages1',
      messages: messages,
    })
    res.status(200).json({
      has_more: hasMore,
      data: messages.map((m) =>
        convertMessageModelToResponse(m, exclude_params as unknown as boolean)
      ),
    })
  }

  function checkCcLimit(req: Request, _res: Response, next: NextFunction) {
    const { cc, bcc } = req.body as ReqBody
    // limit set by AWS SES: https://docs.aws.amazon.com/ses/latest/APIReference/API_SendEmail.html#:~:text=The%20message%20may%20not%20include%20more%20than%2050%20recipients
    const TOTAL_CC_LIMIT = 49 // 50 minus 1 to account for main recipient
    if ((cc?.length ?? 0) + (bcc?.length ?? 0) > TOTAL_CC_LIMIT) {
      throw new ApiTooManyRecipientsError('Maximum of 50 recipients allowed')
    }
    next()
  }

  const rateLimit = expressRateLimit({
    store: new RedisStore({
      prefix: 'transactionalEmail:',
      client: redisService.rateLimitClient,
      expiry: TRANSACTIONAL_EMAIL_WINDOW,
    }),
    keyGenerator: (req: Request) => req?.session?.user.id,
    windowMs: TRANSACTIONAL_EMAIL_WINDOW * 1000,
    max: (req: Request) => req.session?.rateLimit,
    draft_polli_ratelimit_headers: true,
    handler: (req: Request, _res: Response) => {
      logger.warn({
        message: 'Rate limited request to send transactional email',
        userId: req?.session?.user.id,
      })
      throw new ApiRateLimitError('Too many requests. Please try again later.')
    },
  })

  return {
    saveMessage,
    sendMessage,
    rateLimit,
    getById,
    listMessages,
    checkCcLimit,
  }
}
