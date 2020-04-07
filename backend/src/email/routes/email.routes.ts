import { Request, Response, Router } from 'express'
import { celebrate, Joi, Segments } from 'celebrate'

import logger from '@core/logger'
import { uploadStartHandler } from '@core/middlewares/project.middleware'
import { updateProjectS3Metadata } from '@core/services/project.service'

const router = Router()

// validators
const storeTemplateValidator = {
  [Segments.BODY]: Joi.object({
    subject: Joi
      .string(),
    body: Joi
      .string(),
  }),
}

const uploadstartValidator = {
  [Segments.QUERY]: Joi.object({
    mimeType: Joi
      .string()
      .required()
  }),
}

const uploadCompleteValidator = {
  [Segments.BODY]: Joi.object({
    s3Key: Joi.string().required(),
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
const uploadCompleteHandler = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { projectId } = req.params
    // TODO: validate if project is in editable state
    // Updates metadata in project
    await updateProjectS3Metadata({ key: req.body.s3Key, projectId })
    // TODO: delete message_logs entries
    // TODO: carry out templating / hydration
    // - download from s3
    // - populate template
    return res.status(201).json({ message: `Upload success for project ${projectId}.` })
  } catch (err) {
    logger.error(`${err}`)
    res.sendStatus(500)
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
 *  /campaign/{campaignId}/email/upload-start:
 *    post:
 *      tags:
 *        - Email
 *      summary: Gets presigned url for upload
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
 *                  pattern: '^[^\\/]+\.csv$'
 *
 *      responses:
 *        200:
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  url:
 *                    type:string
 */
router.get('/upload/start', celebrate(uploadstartValidator), uploadStartHandler)

/**
 * @swagger
 * path:
 *  /campaign/{campaignId}/email/upload-complete:
 *    post:
 *      tags:
 *        - Email
 *      summary: Populate recipient list with uploaded csv
 *
 *      responses:
 *        200:
 *          content:
 *            application/json:
 *              schema:
 *                type: object
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
