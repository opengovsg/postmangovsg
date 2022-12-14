import { Router } from 'express'
import { celebrate, Joi, Segments } from 'celebrate'
import {
  CampaignMiddleware,
  JobMiddleware,
  ProtectedMiddleware,
  UploadMiddleware,
} from '@core/middlewares'
import {
  EmailMiddleware,
  EmailStatsMiddleware,
  EmailTemplateMiddleware,
} from '@email/middlewares'
import { fromAddressValidator } from '@core/utils/from-address'

export const InitEmailCampaignRoute = (
  emailTemplateMiddleware: EmailTemplateMiddleware,
  emailMiddleware: EmailMiddleware
): Router => {
  const router = Router({ mergeParams: true })

  // validators
  const storeTemplateValidator = {
    [Segments.BODY]: Joi.object({
      subject: Joi.string().required(),
      body: Joi.string().required(),
      reply_to: Joi.string()
        .trim()
        .email()
        .options({ convert: true })
        .lowercase()
        .allow(null)
        .required(),
      from: fromAddressValidator,
      show_logo: Joi.boolean().default(true),
    }),
  }

  const uploadStartValidator = {
    [Segments.QUERY]: Joi.object({
      mime_type: Joi.string().required(),
      md5: Joi.string().required(),
    }),
  }

  const uploadCompleteValidator = {
    [Segments.BODY]: Joi.object({
      transaction_id: Joi.string().required(),
      filename: Joi.string().required(),
      etag: Joi.string().required(),
    }),
  }

  const storeCredentialsValidator = {
    [Segments.BODY]: Joi.object({
      recipient: Joi.string()
        .email()
        .options({ convert: true }) // Converts email to lowercase if it isn't
        .lowercase()
        .required(),
    }),
  }

  const startMultipartValidator = {
    [Segments.QUERY]: Joi.object({
      mime_type: Joi.string().required(),
      part_count: Joi.number().integer().min(1).max(10000).default(1),
    }),
  }

  const completeMultipartValidator = {
    [Segments.BODY]: Joi.object({
      filename: Joi.string().required(),
      transaction_id: Joi.string().required(),
      part_count: Joi.number().integer().min(1).max(10000).required(),
      etags: Joi.array().items(Joi.string()).required(),
    }),
  }

  const duplicateCampaignValidator = {
    [Segments.BODY]: Joi.object({
      name: Joi.string().max(255).trim().required(),
    }),
  }

  const selectListValidator = {
    [Segments.BODY]: Joi.object({
      list_id: Joi.number().required(),
    }),
  }

  // Routes

  // Check if campaign belongs to user for this router
  router.use(emailMiddleware.isEmailCampaignOwnedByUser)

  router.get('/', emailMiddleware.getCampaignDetails)

  router.put(
    '/template',
    celebrate(storeTemplateValidator),
    CampaignMiddleware.canEditCampaign,
    emailMiddleware.isCustomFromAddressAllowed,
    emailMiddleware.isFromAddressAccepted,
    emailMiddleware.existsFromAddress,
    emailMiddleware.verifyFromAddress,
    ProtectedMiddleware.verifyTemplate,
    emailTemplateMiddleware.storeTemplate
  )

  router.get(
    '/upload/start',
    celebrate(uploadStartValidator),
    CampaignMiddleware.canEditCampaign,
    UploadMiddleware.uploadStartHandler
  )

  router.post(
    '/upload/complete',
    celebrate(uploadCompleteValidator),
    CampaignMiddleware.canEditCampaign,
    emailTemplateMiddleware.uploadCompleteHandler
  )

  router.get('/upload/status', emailTemplateMiddleware.pollCsvStatusHandler)

  router.delete(
    '/upload/status',
    CampaignMiddleware.canEditCampaign,
    emailTemplateMiddleware.deleteCsvErrorHandler
  )

  router.post(
    '/credentials',
    celebrate(storeCredentialsValidator),
    CampaignMiddleware.canEditCampaign,
    emailMiddleware.validateAndStoreCredentials
  )

  router.get('/preview', emailMiddleware.previewFirstMessage)

  router.post(
    '/send',
    CampaignMiddleware.canEditCampaign,
    CampaignMiddleware.canSendCampaign,
    JobMiddleware.sendCampaign
  )

  router.post('/stop', JobMiddleware.stopCampaign)

  router.post(
    '/retry',
    CampaignMiddleware.canEditCampaign,
    JobMiddleware.retryCampaign
  )

  router.get('/stats', EmailStatsMiddleware.getStats)

  router.post('/refresh-stats', EmailStatsMiddleware.updateAndGetStats)

  router.get(
    '/export',
    CampaignMiddleware.isCampaignRedacted,
    EmailStatsMiddleware.getDeliveredRecipients
  )

  router.get(
    '/protect/upload/start',
    celebrate(startMultipartValidator),
    CampaignMiddleware.canEditCampaign,
    ProtectedMiddleware.isProtectedCampaign,
    UploadMiddleware.startMultipartUpload
  )

  router.post(
    '/protect/upload/complete',
    celebrate(completeMultipartValidator),
    CampaignMiddleware.canEditCampaign,
    ProtectedMiddleware.isProtectedCampaign,
    UploadMiddleware.completeMultipart,
    emailTemplateMiddleware.uploadProtectedCompleteHandler
  )

  router.post(
    '/duplicate',
    celebrate(duplicateCampaignValidator),
    emailMiddleware.duplicateCampaign
  )

  router.post(
    '/select-list',
    celebrate(selectListValidator),
    emailTemplateMiddleware.selectListHandler
  )

  /**
   * @swagger
   * paths:
   *  /campaign/{campaignId}/email/cancel:
   *    post:
   *      security:
   *        - bearerAuth: []
   *      tags:
   *        - Email
   *      summary: Select the list of recipients from an existing managed list
   *      parameters:
   *        - name: campaignId
   *          in: path
   *          required: true
   *          schema:
   *            type: string
   *      responses:
   *        "200":
   *           description: Successfully cancelled scheduled campaign
   *           schema:
   *             $ref: '#/components/schemas/CampaignMeta'
   *        "401":
   *           description: Unauthorized
   *        "403":
   *           description: Forbidden, campaign not owned by user
   *        "429":
   *          description: Rate limit exceeded. Too many requests.
   *          content:
   *             application/json:
   *               schema:
   *                 $ref: '#/components/schemas/ErrorStatus'
   *               example:
   *                 {status: 429, message: Too many requests. Please try again later.}
   *        "500":
   *          description: Internal Server Error
   *          content:
   *             text/plain:
   *               type: string
   *               example: Internal Server Error
   *        "502":
   *          description: Bad Gateway
   *        "504":
   *          description: Gateway Timeout
   *        "503":
   *          description: Service Temporarily Unavailable
   *        "520":
   *          description: Web Server Returns An Unknown Error
   *        "521":
   *          description: Web Server Is Down
   *        "522":
   *          description: Connection Timed Out
   *        "523":
   *          description: Origin Is Unreachable
   *        "524":
   *          description: A Timeout occurred
   *        "525":
   *          description: SSL handshake failed
   *        "526":
   *          description: Invalid SSL certificate
   */
  router.post('/cancel', JobMiddleware.cancelScheduledCampaign)

  return router
}
