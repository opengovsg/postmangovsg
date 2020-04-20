import { Request, Response, Router, NextFunction } from 'express'
import { celebrate, Joi, Segments } from 'celebrate'
import { difference, keys } from 'lodash'
import { Campaign } from '@core/models'
import { EmailTemplate, EmailMessage } from '@email/models'
import {
  updateCampaignS3Metadata,
  template,
  testHydration,
  extractS3Key,
} from '@core/services'
import { populateEmailTemplate, upsertEmailTemplate } from '@email/services'
import {
  uploadStartHandler,
  sendCampaign,
  stopCampaign,
  retryCampaign,
  canEditCampaign,
} from '@core/middlewares'
import { storeCredentials, getCampaignDetails } from '@email/middlewares'

import {
  MissingTemplateKeysError,
  HydrationError,
  RecipientColumnMissing,
} from '@core/errors'
import { isSuperSet } from '@core/utils'
import logger from '@core/logger'


const router = Router({ mergeParams: true })

// validators
const storeTemplateValidator = {
  [Segments.BODY]: Joi.object({
    subject: Joi
      .string()
      .required(),
    body: Joi
      .string()
      .required(),
  }),
}

const uploadStartValidator = {
  [Segments.QUERY]: Joi.object({
    mimeType: Joi
      .string()
      .required(),
  }),
}

const uploadCompleteValidator = {
  [Segments.BODY]: Joi.object({
    transactionId: Joi.string().required(),
  }),
}

const storeCredentialsValidator = {
  [Segments.BODY]: Joi.object({
    recipient: Joi.string().email()
      .options({ convert: true }) // Converts email to lowercase if it isn't
      .lowercase()
      .required(),
  }),
}

const previewMessageValidator = {
  [Segments.BODY]: Joi.object({
    message: Joi
      .number()
      .integer()
      .positive()
      .optional(),
  }),
}

const sendCampaignValidator = {
  [Segments.BODY]: Joi.object({
    rate: Joi
      .number()
      .integer()
      .positive()
      .optional(),
  }),
}

// handlers

const checkNewTemplateParams = async ({ campaignId, updatedTemplate, firstRecord }: {campaignId: number; updatedTemplate: EmailTemplate; firstRecord: EmailMessage}): Promise<void> => {
  if (!updatedTemplate.params) return

  // first set project.valid to false, switch this back to true only when hydration succeeds
  await Campaign.update({
    valid: false,
  }, {
    where: { id: campaignId },
  })

  const paramsFromS3 = keys(firstRecord.params)
  // warn if params from s3 file are not a superset of saved params
  if (!isSuperSet(paramsFromS3, updatedTemplate.params)) {
    const missingKeys = difference(updatedTemplate.params, paramsFromS3)
    throw new MissingTemplateKeysError(missingKeys)
  }
  // try hydrate(...), return 4xx if unable to do so
  try {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    template(updatedTemplate.body!, firstRecord.params as {[key: string]: string})
    // set campaign.valid to true since templating suceeded AND file has been uploaded
    await Campaign.update({
      valid: true,
    }, {
      where: { id: campaignId },
    })
  } catch (err) {
    logger.error(`Hydration error: ${err.stack}`)
    throw new HydrationError()
  }
}

// Store body of message in email template table
const storeTemplate = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const { campaignId } = req.params
    const { subject, body } = req.body
    // extract params from template, save to db (this will be done with hook)
    const updatedTemplate = await upsertEmailTemplate({
      subject,
      body,
      campaignId: +campaignId,
    })

    const firstRecord = await EmailMessage.findOne({
      where: { campaignId },
    })

    // if recipients list has been uploaded before, have to check if updatedTemplate still matches list
    if (firstRecord && updatedTemplate.params) {
      await checkNewTemplateParams({ campaignId: +campaignId, updatedTemplate, firstRecord })
    }
    return res.status(200).json({
      message: `Template for campaign ${campaignId} updated`,
    })
  } catch (err) {
    if (err instanceof HydrationError) {
      return res.status(400).json({ message: err.message })
    }
    if (err instanceof MissingTemplateKeysError) {
      return res.status(400).json({ message: err.message })
    }
    return next(err)
  }
}

// Read file from s3 and populate messages table
const uploadCompleteHandler = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const { campaignId } = req.params
    // TODO: validate if project is in editable state

    // switch campaign to invalid - this is for the case of uploading over an existing file
    await Campaign.update({
      valid: false,
    }, {
      where: { id: +campaignId },
    })

    // extract s3Key from transactionId
    const { transactionId } = req.body
    let s3Key: string
    try {
      s3Key = extractS3Key(transactionId)
    } catch (err) {
      return res.status(400).json(err.message)
    }

    // check if template exists
    const emailTemplate = await EmailTemplate.findOne({ where: { campaignId } })
    if (emailTemplate === null || emailTemplate.body === null) {
      return res.status(400).json({
        message: 'Template does not exist, please create a template',
      })
    }

    // Updates metadata in project
    await updateCampaignS3Metadata({ key: s3Key, campaignId })

    // carry out templating / hydration
    // - download from s3
    try {
      /* eslint-disable @typescript-eslint/no-non-null-assertion */
      const hydrationResult = await testHydration({
        campaignId: +campaignId,
        s3Key,
        templateBody: emailTemplate.body!,
        templateParams: emailTemplate.params!,
      })
      /* eslint-enable */

      const recipientCount: number = hydrationResult.records.length
      // START populate template
      await populateEmailTemplate(+campaignId, hydrationResult.records)

      /* eslint-disable @typescript-eslint/camelcase */
      return res.status(202).json({
        template_body: emailTemplate.body,
        num_recipients: recipientCount,
        hydrated_record: hydrationResult.hydratedRecord,
      })
      /* eslint-enable */

    } catch (err) {
      logger.error(`Error parsing file for campaign ${campaignId}. ${err.stack}`)
      throw err
    }
  } catch (err) {
    if (err instanceof RecipientColumnMissing || err instanceof MissingTemplateKeysError) {
      return res.status(400).json({ message: err.message })
    }
    return next(err)
  }
}

// Get preview of one message
const previewMessage = async (_req: Request, res: Response): Promise<void> => {
  res.json({ message: 'Message content' })
}


// Routes
// Routes
/**
 * @swagger
 * path:
 *  /campaign/{campaignId}/email:
 *    get:
 *      tags:
 *        - Email
 *      summary: Get email campaign details
 *      parameters:
 *        - name: campaignId
 *          in: path
 *          required: true
 *          schema:
 *            type: string
 *
 *      responses:
 *        200:
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/EmailCampaign'
 */
router.get('/', getCampaignDetails)

/**
 * @swagger
 * path:
 *  /campaign/{campaignId}/email/template:
 *    put:
 *      tags:
 *        - Email
 *      summary: Stores body template for email campaign
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                subject:
 *                  type: string
 *                body:
 *                  type: string
 *
 *      responses:
 *        200:
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 */
router.put('/template', celebrate(storeTemplateValidator), canEditCampaign, storeTemplate)

/**
 * @swagger
 * path:
 *   /campaign/{campaignId}/email/upload/start:
 *     get:
 *       description: "Get a presigned URL for upload"
 *       tags:
 *         - Email
 *       parameters:
 *         - name: campaignId
 *           in: path
 *           required: true
 *           schema:
 *             type: string
 *         - name: mimeType
 *           in: query
 *           required: true
 *           schema:
 *             type: string
 *       responses:
 *         200:
 *           description: Success
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   presignedUrl:
 *                     type: string
 *                   transactionId:
 *                     type: string
 */
router.get('/upload/start', celebrate(uploadStartValidator), canEditCampaign, uploadStartHandler)

/**
 * @swagger
 * path:
 *   /campaign/{campaignId}/email/upload/complete:
 *     post:
 *       description: "Complete upload session"
 *       tags:
 *         - Email
 *       parameters:
 *         - name: campaignId
 *           in: path
 *           required: true
 *           schema:
 *             type: string
 *       requestBody:
 *         content:
 *           application/json:
 *             schema:
 *               required:
 *                 - transactionId
 *               properties:
 *                 transactionId:
 *                   type: string
 *       responses:
 *         201:
 *           description: Created
 *         400:
 *           description: Invalid Request
 *         500:
 *           description: Server Error
 */
router.post('/upload/complete', celebrate(uploadCompleteValidator), canEditCampaign, uploadCompleteHandler)

/**
 * @swagger
 * path:
 *  /campaign/{campaignId}/email/credentials:
 *    post:
 *      tags:
 *        - Email
 *      summary: Sends a test message and defaults to Postman's credentials for the campaign
 *      requestBody:
 *         content:
 *           application/json:
 *             schema:
 *               required:
 *                 - recipient
 *               properties:
 *                 recipient:
 *                   type: string
 *      responses:
 *        200:
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 */
router.post('/credentials', celebrate(storeCredentialsValidator), canEditCampaign, storeCredentials)

/**
 * @swagger
 * path:
 *  /campaign/{campaignId}/email/preview:
 *    get:
 *      tags:
 *        - Email
 *      summary: Preview templated message
 *      parameters:
 *        - in: query
 *          name: message
 *          description: message number, defaults to 1
 *          required: false
 *          schema:
 *            type: integer
 *            minimum: 1
 *
 *      responses:
 *        200:
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 */
router.get('/preview', celebrate(previewMessageValidator), previewMessage)

/**
 * @swagger
 * path:
 *  /campaign/{campaignId}/email/send:
 *    post:
 *      tags:
 *        - Email
 *      summary: Start sending campaign
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                rate:
 *                  type: integer
 *                  minimum: 1
 *
 *      responses:
 *        200:
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 */
router.post('/send', celebrate(sendCampaignValidator), canEditCampaign, sendCampaign)

/**
 * @swagger
 * path:
 *  /campaign/{campaignId}/email/send:
 *    post:
 *      tags:
 *        - Email
 *      summary: Start sending campaign
 *      requestBody:
 *        required: false
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                rate:
 *                  example: 10
 *                  type: integer
 *                  minimum: 1
 *
 *      responses:
 *        200:
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 */
router.post('/send', celebrate(sendCampaignValidator), canEditCampaign, sendCampaign)

/**
 * @swagger
 * path:
 *  /campaign/{campaignId}/email/stop:
 *    post:
 *      tags:
 *        - Email
 *      summary: Stop sending campaign
 *
 *      responses:
 *        200:
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 */
router.post('/stop', stopCampaign)

/**
 * @swagger
 * path:
 *  /campaign/{campaignId}/email/retry:
 *    post:
 *      tags:
 *        - Email
 *      summary: Retry sending campaign
 *
 *      responses:
 *        200:
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 */
router.post('/retry', canEditCampaign, retryCampaign)

export default router
