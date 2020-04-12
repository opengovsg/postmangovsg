import { Request, Response, Router, NextFunction } from 'express'
import { celebrate, Joi, Segments } from 'celebrate'
import { upsertTemplate } from '@sms/services/sms.service'

import logger from '@core/logger'
import { uploadStartHandler } from '@core/middlewares/campaign.middleware'
import { updateCampaignS3Metadata, S3Service } from '@core/services'
import S3 from 'aws-sdk/clients/s3'
import { jwtUtils } from '@core/utils/jwt'

const s3Client = new S3()

const router = Router({ mergeParams: true })

// validators
const storeTemplateValidator = {
  [Segments.BODY]: Joi.object({
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
  [Segments.BODY]: Joi.object({
    twilioAccountSid: Joi
      .string()
      .trim(),
    twilioSomethingId: Joi
      .string()
      .trim(),
    twilioApiKey: Joi
      .string()
      .trim(),
  }),
}

const validateCredentialsValidator = {
  [Segments.BODY]: Joi.object({
    phoneNumber: Joi
      .string()
      .trim()
      .pattern(/^\+\d{8,15}$/),
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

// Store body of message in sms template table
const storeTemplate = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    // extract params from template, save to db (this will be done with hook)
    const updatedTemplate = await upsertTemplate(req.body.body, +req.params.campaignId)

    // check if params exist
    // check if s3 file exists, and hydrate if so (?)
    // FIXME: this is a stub
    const stubbedParamsFromS3 = ['name', 'event']
    // warn if params from s3 file are not a superset of saved params

    // returns true if A is superset of B
    const isSuperSet = (a: Array<string>, b: Array<string>) => a.every(s => b.indexOf(s) !== -1)

    if (!isSuperSet(updatedTemplate[0].params!, stubbedParamsFromS3)) {
      throw new Error('Template contains keys that are not in file')
    }

    return res.status(200).json({
      message: 'ok',
    })
  } catch (err) {
    console.error(err)
    return next(err)
  }
}

// Read file from s3 and populate messages table
const uploadCompleteHandler = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const { campaignId } = req.params
    // TODO: validate if project is in editable state

    // extract s3Key from transactionId
    const { transactionId } = req.body
    let decoded: string
    try {
      decoded = jwtUtils.verify(transactionId) as string
    } catch (err) {
      logger.info(`${err.message}`)
      return res.status(400).json({ message: 'Invalid transactionId provided' })
    }
    const s3Key = decoded as string

    // TODO: begin txn
    // Updates metadata in project
    await updateCampaignS3Metadata({ key: s3Key, campaignId })
    res.status(202).json({ message: `Upload success for campaign ${campaignId}.` })
    // TODO: delete message_logs entries
    // TODO: carry out templating / hydration
    // - download from s3
    try {
      const s3Service = new S3Service(s3Client)
      const downloadStream = s3Service.download(s3Key)
      await s3Service.parseCsv(downloadStream)
      // - populate template
      // TODO: end txn
    } catch (err) {
      logger.error(`Error parsing file for campaign ${campaignId}. ${err.stack}`)
    }
  } catch (err) {
    return next(err)
  }
}

// Read file from s3 and populate messages table
const storeCredentials = async (_req: Request, res: Response): Promise<void> => {
  res.json({ message: 'OK' })
}

// Send validation sms to specified phone number
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
router.put('/template', celebrate(storeTemplateValidator), storeTemplate)

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
router.get('/upload/start', celebrate(uploadStartValidator), uploadStartHandler)

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
router.post('/upload/complete', celebrate(uploadCompleteValidator), uploadCompleteHandler)

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
router.post('/credentials', celebrate(storeCredentialsValidator), storeCredentials)

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
 *                phoneNumber:
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
