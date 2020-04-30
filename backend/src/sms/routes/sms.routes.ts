import { Request, Response, Router, NextFunction } from 'express'
import { celebrate, Joi, Segments } from 'celebrate'
import { difference, keys } from 'lodash'
import xss from 'xss'
import { Campaign } from '@core/models'
import { SmsMessage, SmsTemplate } from '@sms/models'
import {
  updateCampaignS3Metadata,
  template,
  testHydration,
  extractS3Key,
} from '@core/services'
import { populateSmsTemplate, upsertSmsTemplate, getSmsStats } from '@sms/services'
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
  TemplateError,
} from '@core/errors'
import { isSuperSet } from '@core/utils'
import { storeCredentials, getCampaignDetails, previewFirstMessage } from '@sms/middlewares'
import logger from '@core/logger'
import config from '@core/config'

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
    filename: Joi.string().required(),
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
    recipient: Joi
      .string()
      .trim()
      .required(),
  }),
}

const sendCampaignValidator = {
  [Segments.BODY]: Joi.object({
    rate: Joi
      .number()
      .integer()
      .positive()
      .default(10),
  }),
}

// handlers

/**
 * side effects:
 *  - updates campaign 'valid' column
 *  - may delete sms_message where campaignId
 */
const checkNewTemplateParams = async ({
  campaignId,
  updatedTemplate,
  firstRecord,
}: {
  campaignId: number;
  updatedTemplate: SmsTemplate;
  firstRecord: SmsMessage;
}): Promise<{
  reupload: boolean;
  extraKeys?: Array<string>;
}> => {
  // new template might not even have params, (not inserted yet - hydration doesn't even need to take place
  if (!updatedTemplate.params) return { reupload: false }

  // first set project.valid to false, switch this back to true only when hydration succeeds
  await Campaign.update({ valid: false }, { where: { id: campaignId } })

  const paramsFromS3 = keys(firstRecord.params)

  const templateContainsExtraKeys = !isSuperSet(paramsFromS3, updatedTemplate.params)
  if (templateContainsExtraKeys) {
    // warn if params from s3 file are not a superset of saved params, remind user to re-upload a new file
    const extraKeysInTemplate = difference(
      updatedTemplate.params,
      paramsFromS3
    )

    // the entries (message_logs) from the uploaded file are no longer valid, so we delete
    await SmsMessage.destroy({
      where: {
        campaignId,
      },
    })

    return { reupload: true, extraKeys: extraKeysInTemplate }
  } else {
    // the keys in the template are either a subset or the same as what is present in the uploaded file

    try {
      template(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        updatedTemplate.body!,
        firstRecord.params as { [key: string]: string }
      )
    } catch (err) {
      logger.error(`Hydration error: ${err.stack}`)
      throw new HydrationError()
    }
    // set campaign.valid to true since templating suceeded AND file has been uploaded
    await Campaign.update({ valid: true }, {
      where: { id: campaignId },
    })

    return { reupload: false }
  }
}

const replaceNewLinesAndSanitize = (body: string): string => {
  return xss.filterXSS(body.replace(/(\n|\r\n)/g,'<br/>'), config.xssOptions.sms)
}

// Store body of message in sms template table
const storeTemplate = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const { campaignId } = req.params
    const { body } = req.body
    // extract params from template, save to db (this will be done with hook)
    const updatedTemplate = await upsertSmsTemplate(replaceNewLinesAndSanitize(body), +campaignId)

    const firstRecord = await SmsMessage.findOne({
      where: { campaignId },
    })

    // if recipients list has been uploaded before, have to check if updatedTemplate still matches list
    if (firstRecord && updatedTemplate.params) {
      const check = await checkNewTemplateParams({
        campaignId: +campaignId,
        updatedTemplate,
        firstRecord,
      })
      if (check.reupload) {
        /* eslint-disable @typescript-eslint/camelcase */
        return res.status(200)
          .json({
            message: 'Please re-upload your recipient list as template has changed.',
            extra_keys: check.extraKeys,
            num_recipients: 0,
            valid: false,
            updatedTemplate: {
              body: updatedTemplate?.body,
              params: updatedTemplate?.params,
            },
          })
        /* eslint-enable */
      }
    }

    const recipientCount = await SmsMessage.count({ where: { campaignId } })
    const campaign = await Campaign.findByPk(+campaignId)
    /* eslint-disable @typescript-eslint/camelcase */
    return res.status(200)
      .json({
        message: `Template for campaign ${campaignId} updated`,
        valid: campaign?.valid,
        num_recipients: recipientCount,
        updatedTemplate: {
          body: updatedTemplate.body,
          params: updatedTemplate.params,
        },
      })
    /* eslint-enable */
  } catch (err) {
    if (err instanceof HydrationError || err instanceof TemplateError) {
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
    const { transactionId, filename } = req.body
    let s3Key: string
    try {
      s3Key = extractS3Key(transactionId)
    } catch (err) {
      return res.status(400).json(err.message)
    }

    // check if template exists
    const smsTemplate = await SmsTemplate.findOne({ where: { campaignId } })
    if (!smsTemplate?.body || !smsTemplate?.params) {
      return res.status(400).json({
        message: 'Template does not exist, please create a template',
      })
    }

    // Updates metadata in project
    await updateCampaignS3Metadata({ key: s3Key, campaignId, filename })

    // carry out templating / hydration
    // - download from s3
    try {
      const { records, hydratedRecord } = await testHydration({
        campaignId: +campaignId,
        s3Key,
        templateBody: smsTemplate.body,
        templateParams: smsTemplate.params,
      })

      const recipientCount: number = records.length
      // START populate template
      // TODO: is actually populate message logs
      await populateSmsTemplate(+campaignId, records)

      return res.json({
        'num_recipients': recipientCount,
        preview: hydratedRecord,
      })

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

// Get the stats of a campaign
const campaignStatsHandler = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  const { campaignId } = req.params

  try {
    const stats = await getSmsStats(+campaignId)
    return res.json(stats)
  } catch (err) {
    return next(err)
  }
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
 *   /campaign/{campaignId}/sms/template:
 *     put:
 *       tags:
 *         - SMS
 *       summary: Stores body template for sms campaign
 *       parameters:
 *         - name: campaignId
 *           in: path
 *           required: true
 *           schema:
 *             type: string
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 body:
 *                   type: string
 *                   minLength: 1
 *                   maxLength: 200
 *
 *       responses:
 *         200:
 *           description: Success
 *           content:
 *             application/json:
 *               schema:
 *                 required:
 *                   - message
 *                   - valid
 *                   - num_recipients
 *                 properties:
 *                   message:
 *                     type: string
 *                   extra_keys:
 *                     type: array
 *                     items:
 *                       type: string
 *                   valid:
 *                     type: boolean
 *                   num_recipients:
 *                     type: integer
 *         400:
 *           description: Bad Request
 *         500:
 *           description: Internal Server Error
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
 *                 - filename
 *               properties:
 *                 transactionId:
 *                   type: string
 *                 filename:
 *                   type: string
 *       responses:
 *         200:
 *           description: Success
 *           content:
 *             application/json:
 *               schema:
 *                 properties:
 *                   num_recipients:
 *                     type: string
 *                   preview:
 *                     type: object
 *                     properties:
 *                       body:
 *                         type: string
 *
 *         400:
 *           description: Invalid Request
 *         500:
 *           description: Server Error
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
 *            required:
 *              - recipient
 *              - twilioCredentials
 *            properties:
 *              recipient:
 *                type: string
 *              twilioCredentials:
 *                $ref: '#/components/schemas/TwilioCredentials'
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
 *
 *      responses:
 *        200:
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  preview:
 *                    type: object
 *                    properties:
 *                      body:
 *                        type: string                    
 *                  
 */
router.get('/preview', previewFirstMessage)

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

/**
 * @swagger
 * path:
*  /campaign/{campaignId}/sms/stats:
 *    get:
 *      tags:
 *        - SMS
 *      summary: Get sms campaign stats
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
 *                $ref: '#/components/schemas/CampaignStats'
 */
router.get('/stats', campaignStatsHandler)


export default router
