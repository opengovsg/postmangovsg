import { Router } from 'express'
import bytes from 'bytes'
import { celebrate, Joi, Segments } from 'celebrate'
import {
  EmailTransactionalMiddleware,
  EmailMiddleware,
} from '@email/middlewares'
import { fromAddressValidator } from '@core/utils/from-address'
import { FileAttachmentMiddleware } from '@core/middlewares'
import {
  TransactionalEmailMessageStatus,
  TransactionalEmailClassification,
} from '@email/models'
import { TransactionalEmailSortField } from '@core/constants'
import config from '@core/config'

export const InitEmailTransactionalRoute = (
  emailTransactionalMiddleware: EmailTransactionalMiddleware,
  emailMiddleware: EmailMiddleware
): Router => {
  const router = Router({ mergeParams: true })

  // Validators
  const emailValidator = Joi.string()
    .trim()
    .email()
    .options({ convert: true })
    .lowercase()

  const emailArrayValidation = (fieldName: 'cc' | 'bcc') => {
    return Joi.alternatives().try(
      // array
      Joi.array().unique().items(emailValidator),

      // stringified array (form-data)
      Joi.string().custom((value: string) => {
        let parsed
        try {
          parsed = JSON.parse(value)
        } catch {
          throw new Error(
            `${fieldName} must be a valid array or stringified array.`
          )
        }

        if (!Array.isArray(parsed)) {
          throw new Error(`${fieldName} must be a valid stringified array`)
        }
        const { value: validatedEmails, error } = Joi.array()
          .unique()
          .items(emailValidator)
          .validate(parsed)

        if (error) {
          throw new Error(`${fieldName} ${error.message}`)
        }

        return validatedEmails
      })
    )
  }

  const sendValidator = {
    [Segments.BODY]: Joi.object({
      recipient: Joi.string()
        .email({
          allowUnicode: false,
        })
        .options({ convert: true })
        .lowercase()
        .required(),
      subject: Joi.string().required(),
      body: Joi.string()
        .max(config.get('transactionalEmail.bodySizeLimit'), 'utf8')
        .required()
        // custom error message because Joi's default message doesn't fully reflect the validation rules
        .error(
          new Error(
            `body is a required string whose size must be less than or equal to ${bytes.format(
              config.get('transactionalEmail.bodySizeLimit')
            )} in UTF-8 encoding`
          )
        ),
      from: fromAddressValidator,
      reply_to: emailValidator,
      attachments: Joi.array().items(Joi.object().keys().required()),
      classification: Joi.string()
        .uppercase()
        .valid(...Object.values(TransactionalEmailClassification))
        .optional(),
      tag: Joi.string().max(255).optional(),
      cc: emailArrayValidation('cc'),
      bcc: emailArrayValidation('bcc'),
      disable_tracking: Joi.boolean().default(false),
    }),
  }
  const getByIdValidator = {
    [Segments.PARAMS]: Joi.object({
      emailId: Joi.number().required(),
    }),
  }

  const listMessagesValidator = {
    [Segments.QUERY]: Joi.object({
      limit: Joi.number().integer().min(1).max(1000).default(10),
      offset: Joi.number().integer().min(0).default(0),
      tag: Joi.string().max(255),
      exclude_params: Joi.boolean().default(false),
      status: Joi.string()
        .uppercase()
        .valid(...Object.values(TransactionalEmailMessageStatus)),
      created_at: Joi.object({
        gt: Joi.date().iso(),
        gte: Joi.date().iso(),
        lt: Joi.date().iso(),
        lte: Joi.date().iso(),
      }),
      sort_by: Joi.string()
        .pattern(
          new RegExp(
            // accepts TransactionalEmailSortField values with optional +/- prefix
            `^[+-]?${Object.values(TransactionalEmailSortField).join('|')}$`
          )
        )
        .default(TransactionalEmailSortField.Created),
    }),
  }

  // Routes

  router.post(
    '/send',
    emailTransactionalMiddleware.rateLimit,
    FileAttachmentMiddleware.getFileUploadHandler(
      // this limit applies on a per-file basis, not a cumulative basis
      // but we apply maxCumulativeAttachmentsSize since each file size cannot exceed this limit
      config.get('file.maxCumulativeAttachmentsSize') as number,
      // this is necessary as express-fileupload relies on busboy, which has a
      // default field size limit of 1MB and does not throw any error
      // by setting the limit to be 1 byte above the max, any request with
      // a field size exceeding the limit will be truncated to just above the limit
      // which will be caught by Joi validation
      (config.get('transactionalEmail.bodySizeLimit') as number) + 1
    ),
    FileAttachmentMiddleware.preprocessPotentialIncomingFile,
    celebrate(sendValidator),
    FileAttachmentMiddleware.checkAttachmentValidity,
    emailTransactionalMiddleware.checkCcLimit,
    emailTransactionalMiddleware.saveMessage,
    emailMiddleware.isFromAddressAccepted,
    emailMiddleware.existsFromAddress, // future todo: put a cache to reduce db hits
    emailTransactionalMiddleware.sendMessage
  )

  router.get(
    '/',
    celebrate(listMessagesValidator),
    emailTransactionalMiddleware.listMessages
  )

  router.get(
    '/:emailId',
    celebrate(getByIdValidator),
    emailTransactionalMiddleware.getById
  )

  return router
}
