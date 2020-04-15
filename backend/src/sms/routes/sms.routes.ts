import { Request, Response, Router, NextFunction } from 'express'
import { celebrate, Joi, Segments } from 'celebrate'
import { difference, keys } from 'lodash'

import { template, testHydration } from '@core/services/template.service'
import { extractS3Key } from '@core/services/campaign.service'
import { populateSmsTemplate, upsertSmsTemplate } from '@sms/services/sms.service'
import { storeCredentials } from '@sms/middlewares'

import logger from '@core/logger'
import { uploadStartHandler } from '@core/middlewares/campaign.middleware'
import { updateCampaignS3Metadata } from '@core/services'

import { Campaign } from '@core/models'
import { SmsMessage, SmsTemplate } from '@sms/models'
import { 
  updateCampaignS3Metadata,
  template, 
  testHydration,
  extractS3Key,
} from '@core/services'
import { populateSmsTemplate, upsertSmsTemplate } from '@sms/services'
import { 
  uploadStartHandler, 
  sendCampaign, 
  stopCampaign, 
  retryCampaign, 
  canEditCampaign, 
} from '@core/middlewares'
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
    twilioAccountSid: Joi
      .string()
      .trim()
      .required(),
    twilioApiSecret: Joi
      .string()
      .trim()
      .required(),
    twilioApiKey: Joi
      .string()
      .trim()
      .required(),
    twilioMessagingServiceSid: Joi
    .string()
    .trim()
    .required(),
    testNumber: Joi
    .string()
    .trim()
    .required(),
  }),
}

const previewMessageValidator = {
  [Segments.QUERY]: Joi.object({
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
// Get campaign details
const getCampaignDetails = async (_req: Request, res: Response): Promise<void> => {
  res.json({ message: 'OK' })
}

const checkNewTemplateParams = async ({ campaignId, updatedTemplate, firstRecord }: {campaignId: number; updatedTemplate: SmsTemplate; firstRecord: SmsMessage}): Promise<void> => {
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

// Store body of message in sms template table
const storeTemplate = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const { campaignId } = req.params
    // extract params from template, save to db (this will be done with hook)
    const updatedTemplate = await upsertSmsTemplate(req.body.body, +campaignId)

    const firstRecord = await SmsMessage.findOne({
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
    const smsTemplate = await SmsTemplate.findOne({ where: { campaignId } })
    if (smsTemplate === null || smsTemplate.body === null) {
      return res.status(400).json({
        message: 'Template does not exist, please create a template',
      })
    }

    // Updates metadata in project
    await updateCampaignS3Metadata({ key: s3Key, campaignId })

    // carry out templating / hydration
    // - download from s3
    try {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const records = await testHydration(+campaignId, s3Key, smsTemplate.params!)
      // START populate template
      populateSmsTemplate(+campaignId, records)
    } catch (err) {
      logger.error(`Error parsing file for campaign ${campaignId}. ${err.stack}`)
      throw err
    }
    return res.status(202).json({ message: `Upload success for campaign ${campaignId}.` })
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
/**
 * @swagger
 * path:
 *  /campaign/{campaignId}/sms:
 *    get:
 *      tags:
 *        - SMS
 *      summary: Get sms campaign details
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
 *                $ref: '#/components/schemas/SmsCampaign'
 */
router.get('/', getCampaignDetails)

/**
 * @swagger
 * path:
 *  /campaign/{campaignId}/sms/template:
 *    put:
 *      tags:
 *        - SMS
 *      summary: Stores body template for sms campaign
 *      parameters:
 *        - name: campaignId
 *          in: path
 *          required: true
 *          schema:
 *            type: string
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                body:
 *                  type: string
 *                  minLength: 1
 *                  maxLength: 200
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
 *   /campaign/{campaignId}/sms/upload/start:
 *     get:
 *       description: "Get a presigned URL for upload"
 *       tags:
 *         - SMS
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
 *   /campaign/{campaignId}/sms/upload/complete:
 *     post:
 *       description: "Complete upload session"
 *       tags:
 *         - SMS
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
 *
 */
router.post('/upload/complete', celebrate(uploadCompleteValidator), canEditCampaign, uploadCompleteHandler)

/**
 * @swagger
 * path:
 *  /campaign/{campaignId}/sms/credentials:
 *    post:
 *      tags:
 *        - SMS
 *      summary: Store credentials for twilio
 *      parameters:
 *        - name: campaignId
 *          in: path
 *          required: true
 *          schema:
 *            type: string
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/TwilioCredentials'
 *
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
 *  /campaign/{campaignId}/sms/validate:
 *    post:
 *      tags:
 *        - SMS
 *      summary: Vaidates stored credentials by sending to a specific phone number
 *      parameters:
 *        - name: campaignId
 *          in: path
 *          required: true
 *          schema:
 *            type: string
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                twilioAccountSid:
 *                  type: string
 *                twilioApiSecret:
 *                  type: string
 *                twilioApiKey:
 *                  type: string
 *                twilioMessagingServiceSid:
 *                  type: string 
 *                testNumber:
 *                  type: string 
 *
 *      responses:
 *        200:
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 */
router.post('/validate', celebrate(validateCredentialsValidator), canEditCampaign, validateCredentials)


/**
 * @swagger
 * path:
 *  /campaign/{campaignId}/sms/preview:
 *    get:
 *      tags:
 *        - SMS
 *      summary: Preview templated message
 *      parameters:
 *        - name: campaignId
 *          in: path
 *          required: true
 *          schema:
 *            type: string
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
 *  /campaign/{campaignId}/sms/send:
 *    post:
 *      tags:
 *        - SMS
 *      summary: Start sending campaign
 *      parameters:
 *        - name: campaignId
 *          in: path
 *          required: true
 *          schema:
 *            type: string
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
 *  /campaign/{campaignId}/sms/stop:
 *    post:
 *      tags:
 *        - SMS
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
 *  /campaign/{campaignId}/sms/retry:
 *    post:
 *      tags:
 *        - SMS
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
