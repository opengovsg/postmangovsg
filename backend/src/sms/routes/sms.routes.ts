import S3 from 'aws-sdk/clients/s3'
import { Request, Response, Router, NextFunction } from 'express'
import { celebrate, Joi, Segments } from 'celebrate'
import { keys } from 'lodash'

import { template, upsertTemplate } from '@sms/services/sms.service'

import logger from '@core/logger'
import { uploadStartHandler } from '@core/middlewares/campaign.middleware'
import { updateCampaignS3Metadata, S3Service } from '@core/services'
import { jwtUtils } from '@core/utils/jwt'

import { Campaign } from '@core/models'
import { SmsMessage, SmsTemplate } from '@sms/models'


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

/**
 * returns true if A is superset of B
 * @param a - list
 * @param b - list
 */
const isSuperSet = (a: Array<string>, b: Array<string>): boolean => b.every(s => a.indexOf(s) !== -1)

// Store body of message in sms template table
const storeTemplate = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const { campaignId } = req.params
    // extract params from template, save to db (this will be done with hook)
    const updatedTemplate = await upsertTemplate(req.body.body, +campaignId)

    const firstRecord = await SmsMessage.findOne({
      where: { campaignId },
    })

    // if recipients list has been uploaded before, have to check if updatedTemplate still matches list
    if (firstRecord && updatedTemplate.params) {
      // first set project.valid to false, switch this back to true only when hydration succeeds
      await Campaign.update({
        valid: false,
      }, {
        where: { id: campaignId },
      })

      const paramsFromS3 = keys(firstRecord.params)
      // warn if params from s3 file are not a superset of saved params
      if (!isSuperSet(paramsFromS3, updatedTemplate.params)) {
        return res.status(400).json({
          // TODO: lodash diff to show missing keys
          message: 'Template contains keys that are not in file',
        })
      }
      // try hydrate(...), return 4xx if unable to do so
      try {
        template(updatedTemplate.body!, firstRecord.params as {[key: string]: string})
        // set campaign.valid to true since templating suceeded AND file has been uploaded
        await Campaign.update({
          valid: true,
        }, {
          where: { id: campaignId },
        })
      } catch (err) {
        logger.error(`Hydration error: ${err.stack}`)
        return res.status(400).json({
          message: 'Unable to hydrate message.',
        })
      }

    }
    return res.status(200).json({
      message: 'ok',
    })
  } catch (err) {
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
      where: { id: campaignId },
    })


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

    // check if template exists
    const smsTemplate = await SmsTemplate.findOne({ where: { campaignId } })
    if (smsTemplate === null || smsTemplate.body === null) {
      return res.status(400).json({
        message: 'Template does not exist, please create a template',
      })
    }

    // Updates metadata in project
    await updateCampaignS3Metadata({ key: s3Key, campaignId })
    res.status(202).json({ message: `Upload success for campaign ${campaignId}.` })

    // carry out templating / hydration
    // - download from s3
    try {
      const s3Service = new S3Service(s3Client)
      const downloadStream = s3Service.download(s3Key)
      const fileContents = await s3Service.parseCsv(downloadStream)
      // FIXME / TODO: dedupe
      const records: Array<object> = fileContents.map(entry => {
        return {
          campaignId,
          recipient: entry['recipient'],
          params: entry,
        }
      })

      // attempt to hydrate
      const firstRecord = fileContents[0]
      // if body exists, smsTemplate.params should also exist
      if (!isSuperSet(keys(firstRecord), smsTemplate.params!)) {
        // TODO: lodash diff to show missing keys
        logger.error('Hydration failed: Template contains keys that are not in file.')
      }

      // START populate template
      // begin txn
      let transaction
      try {
        transaction = await SmsMessage.sequelize?.transaction()
        // delete message_logs entries
        await SmsMessage.destroy({
          where: { campaignId },
          transaction,
        })
        await SmsMessage.bulkCreate(records, { transaction })
        await Campaign.update({
          valid: true,
        }, {
          where: {
            id: campaignId,
          },
          transaction,
        })
        // TODO: end txn
        await transaction?.commit()
      } catch (err) {
        await transaction?.rollback()
        logger.error(`SmsMessage: destroy / bulkcreate failure. ${err.stack}`)
      }
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
