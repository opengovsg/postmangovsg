import config from '@core/config'
import {
  AuthMiddleware,
  AuthType,
  FileAttachmentMiddleware,
} from '@core/middlewares'
import { Joi, Segments, celebrate } from 'celebrate'
import { Router } from 'express'

export const InitCommonAttachmentRoute = (
  authMiddleware: AuthMiddleware
): Router => {
  const router = Router()

  router.post(
    '/',
    authMiddleware.getAuthMiddleware([AuthType.Cookie]),
    FileAttachmentMiddleware.getFileUploadHandler(
      config.get('commonAttachments.maxFileSize'),
      // this is necessary as express-fileupload relies on busboy, which has a
      // default field size limit of 1MB and does not throw any error
      // by setting the limit to be 1 byte above the max, any request with
      // a field size exceeding the limit will be truncated to just above the limit
      // which will be caught by Joi validation
      (config.get('transactionalEmail.bodySizeLimit') as number) + 1
    ),
    FileAttachmentMiddleware.transformAttachmentsFieldToArray,
    celebrate({
      [Segments.BODY]: Joi.object({
        attachments: Joi.array()
          .items(Joi.object().keys().required())
          .required(),
      }),
    }),
    FileAttachmentMiddleware.storeCampaignEmbed
  )

  router.get(
    '/:attachmentId/:fileName',
    celebrate({
      [Segments.PARAMS]: Joi.object({
        attachmentId: Joi.string().guid({ version: 'uuidv4' }).required(),
        fileName: Joi.string().required(),
      }),
    }),
    FileAttachmentMiddleware.streamCampaignEmbed
  )

  return router
}
