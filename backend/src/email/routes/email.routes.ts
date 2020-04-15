import { Request, Response, Router, NextFunction } from 'express'
import { celebrate, Joi, Segments } from 'celebrate'

import logger from '@core/logger'
import { Campaign } from '@core/models'
import { extractS3Key } from '@core/services/campaign.service'
import { testHydration } from '@core/services/template.service'
import { uploadStartHandler } from '@core/middlewares/campaign.middleware'
import { updateCampaignS3Metadata } from '@core/services'
import { EmailTemplate } from '@email/models'
import { populateEmailTemplate } from '@email/services/email.service'
import { MissingTemplateKeysError } from '@core/errors/template.errors'
import { RecipientColumnMissing } from '@core/errors/s3.errors'

const router = Router({ mergeParams: true })

// validators
const storeTemplateValidator = {
  [Segments.BODY]: Joi.object({
    subject: Joi
      .string(),
    body: Joi
      .string(),
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
  // really not sure
  [Segments.BODY]: Joi.object({
    sesUsername: Joi
      .string()
      .trim(),
    sesApiKey: Joi
      .string()
      .trim(),
  }),
}

const validateCredentialsValidator = {
  [Segments.BODY]: Joi.object({
    email: Joi
      .string()
      .trim()
      .pattern(/^\+\d{8,15}$/),
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

const sendMessagesValidator = {
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

// Store body of message in email template table
const storeTemplate = async (_req: Request, res: Response): Promise<void> => {
  res.json({ message: 'OK' })
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
      const records = await testHydration(+campaignId, s3Key, emailTemplate.params!)
      // START populate template
      populateEmailTemplate(+campaignId, records)
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

// Read file from s3 and populate messages table
const storeCredentials = async (_req: Request, res: Response): Promise<void> => {
  res.json({ message: 'OK' })
}

// Send validation email to specified phone number
const validateCredentials = async (_req: Request, res: Response): Promise<void> => {
  res.json({ message: 'OK' })
}

// Get preview of one message
const previewMessage = async (_req: Request, res: Response): Promise<void> => {
  res.json({ message: 'Message content' })
}

// Queue job for sending
const sendMessages = async (_req: Request, res: Response): Promise<void> => {
  res.json({ message: 'OK' })
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
router.put('/template', celebrate(storeTemplateValidator), storeTemplate)

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
router.get('/upload/start', celebrate(uploadStartValidator), uploadStartHandler)

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
router.post('/upload/complete', celebrate(uploadCompleteValidator), uploadCompleteHandler)

/**
 * @swagger
 * path:
 *  /campaign/{campaignId}/email/credentials:
 *    post:
 *      tags:
 *        - Email
 *      summary: Store credentials for SES
 *
 *      responses:
 *        200:
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 */
router.post('/credentials', celebrate(storeCredentialsValidator), storeCredentials)

/**
 * @swagger
 * path:
 *  /campaign/{campaignId}/email/validate:
 *    post:
 *      tags:
 *        - Email
 *      summary: Vaidates stored credentials by sending to a specific phone number
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                emailAddress:
 *                  type: string
 *                  pattern: '^\+\d{8,15}$'
 *
 *      responses:
 *        200:
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 */
router.post('/validate', celebrate(validateCredentialsValidator), validateCredentials)


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
router.post('/send', celebrate(sendMessagesValidator), sendMessages)

export default router
