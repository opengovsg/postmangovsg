import { Request, Response, Router } from 'express'
import { celebrate, Joi, Segments } from 'celebrate'

const router = Router()

// validators
const storeTemplateValidator = {
  [Segments.BODY]: Joi.object({
    body: Joi
      .string(),
  }),
}

const uploadstartValidator = {
  [Segments.BODY]: Joi.object({
    filename: Joi
      .string()
      .trim()
      .min(5)
      .max(100)
      .pattern(/^[^\\/]+\.csv$/),
  }),
}

const uploadCompleteValidator = {
  [Segments.BODY]: Joi.object(),
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
const getProjectDetails = async (_req: Request, res: Response): Promise<void> => {
  res.json({ message: 'OK' })
}

// Store body of message in sms template table
const storeTemplate = async (_req: Request, res: Response): Promise<void> => {
  res.json({ message: 'OK' })
}

// Returns presigned url for upload
const uploadStart = async (_req: Request, res: Response): Promise<void> => {
  res.json({ signedUrl: '' })
}

// Read file from s3 and populate messages table
const uploadComplete = async (_req: Request, res: Response): Promise<void> => {
  res.json({ numMessages: 100 })
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
router.get('/', getProjectDetails)

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
 *  /campaign/{campaignId}/sms/upload-start:
 *    post:
 *      tags:
 *        - SMS
 *      summary: Gets presigned url for upload
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
router.post('/upload-start', celebrate(uploadstartValidator), uploadStart)

/**
 * @swagger
 * path:
 *  /campaign/{campaignId}/sms/upload-complete:
 *    post:
 *      tags:
 *        - SMS
 *      summary: Populate recipient list with uploaded csv
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
 *                type: object
 */
router.post('/upload-complete', celebrate(uploadCompleteValidator), uploadComplete)

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
