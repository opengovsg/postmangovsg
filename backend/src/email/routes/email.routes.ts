import { Request, Response, Router } from 'express'
import { celebrate, Joi, Segments } from 'celebrate'

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
// Get project details
async function getProjectDetails(_req: Request, res: Response): Promise<void> {
  res.json({ message: 'OK' })
}

// Store body of message in email template table
async function storeTemplate(_req: Request, res: Response): Promise<void> {
  res.json({ message: 'OK' })
}

// Returns presigned url for upload
async function uploadStart(_req: Request, res: Response): Promise<void> {
  res.json({ signedUrl: '' })
}

// Read file from s3 and populate messages table
async function uploadComplete(_req: Request, res: Response): Promise<void> {
  res.json({ numMessages: 100 })
}

// Read file from s3 and populate messages table
async function storeCredentials(_req: Request, res: Response): Promise<void> {
  res.json({ message: 'OK' })
}

// Send validation email to specified phone number
async function validateCredentials(_req: Request, res: Response): Promise<void> {
  res.json({ message: 'OK' })
}

// Get preview of one message
async function previewMessage(_req: Request, res: Response): Promise<void> {
  res.json({ message: 'Message content' })
}

// Queue job for sending
async function sendMessages(_req: Request, res: Response): Promise<void> {
  res.json({ message: 'OK' })
}

// Routes
// Routes
/**
 * @swagger
 * path:
 *  /project/{projectId}/email:
 *    get:
 *      tags:
 *        - Email
 *      summary: Get email project details
 *      parameters:
 *        - name: projectId
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
 *                $ref: '#/components/schemas/EmailProject'
 */
router.get('/', getProjectDetails)

/**
 * @swagger
 * path:
 *  /project/{projectId}/email/template:
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
 *  /project/{projectId}/email/upload-start:
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
router.post('/upload-start', celebrate(uploadstartValidator), uploadStart)

/**
 * @swagger
 * path:
 *  /project/{projectId}/email/upload-complete:
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
router.post('/upload-complete', celebrate(uploadCompleteValidator), uploadComplete)

/**
 * @swagger
 * path:
 *  /project/{projectId}/email/credentials:
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
 *  /project/{projectId}/email/validate:
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
 *  /project/{projectId}/email/preview:
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
 *  /project/{projectId}/email/send:
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
