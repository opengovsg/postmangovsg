import { Request, Response, Router, NextFunction } from 'express'
import { celebrate, Joi, Segments } from 'celebrate'
import { difference, keys } from 'lodash'
import xss from 'xss'
import { Campaign } from '@core/models'
import { EmailTemplate, EmailMessage } from '@email/models'
import {
  updateCampaignS3Metadata,
  template,
  testHydration,
  extractS3Key,
} from '@core/services'
import { populateEmailTemplate, upsertEmailTemplate, getEmailStats } from '@email/services'
import {
  uploadStartHandler,
  sendCampaign,
  stopCampaign,
  retryCampaign,
  canEditCampaign,
} from '@core/middlewares'
import { storeCredentials, getCampaignDetails, previewFirstMessage } from '@email/middlewares'

import {
  MissingTemplateKeysError,
  HydrationError,
  RecipientColumnMissing,
  TemplateError,
} from '@core/errors'
import { isSuperSet } from '@core/utils'
import logger from '@core/logger'
import config from '@core/config'


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
    'mime_type': Joi
      .string()
      .required(),
  }),
}

const uploadCompleteValidator = {
  [Segments.BODY]: Joi.object({
    'transaction_id': Joi.string().required(),
    filename: Joi.string().required(),
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
 *  - may delete email_message where campaignId
 */
const checkNewTemplateParams = async ({
  campaignId,
  updatedTemplate,
  firstRecord,
}: {
  campaignId: number;
  updatedTemplate: EmailTemplate;
  firstRecord: EmailMessage;
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
    await EmailMessage.destroy({
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
  return xss.filterXSS(body.replace(/(\n|\r\n)/g,'<br/>'), config.xssOptions.email)
}

// Store body of message in email template table
// Store body of message in sms template table
const storeTemplate = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const { campaignId } = req.params
    const { subject, body } = req.body
    // extract params from template, save to db (this will be done with hook)
    const updatedTemplate = await upsertEmailTemplate({
      subject: replaceNewLinesAndSanitize(subject),
      body: replaceNewLinesAndSanitize(body),
      campaignId: +campaignId,
    })

    const firstRecord = await EmailMessage.findOne({
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
        return res.status(200)
          .json({
            message: 'Please re-upload your recipient list as template has changed.',
            'extra_keys': check.extraKeys,
            'num_recipients': 0,
            valid: false,
            template: {
              body: updatedTemplate?.body,
              subject: updatedTemplate?.subject,
              params: updatedTemplate?.params,
            },
          })
      }
    }

    const recipientCount = await EmailMessage.count({ where: { campaignId } })
    const campaign = await Campaign.findByPk(+campaignId)
    return res.status(200)
      .json({
        message: `Template for campaign ${campaignId} updated`,
        valid: campaign?.valid,
        'num_recipients': recipientCount,
        template: {
          body: updatedTemplate?.body,
          subject: updatedTemplate?.subject,
          params: updatedTemplate?.params,
        },
      })
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
    const { 'transaction_id': transactionId, filename } = req.body
    let s3Key: string
    try {
      s3Key = extractS3Key(transactionId)
    } catch (err) {
      return res.status(400).json(err.message)
    }

    // check if template exists
    const emailTemplate = await EmailTemplate.findOne({ where: { campaignId } })
    if (!emailTemplate?.body || !emailTemplate?.subject || !emailTemplate.params) {
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
        templateSubject: emailTemplate.subject,
        templateBody: emailTemplate.body,
        templateParams: emailTemplate.params,
      })

      const recipientCount: number = records.length
      // START populate template
      // TODO: is actually populate message logs
      await populateEmailTemplate(+campaignId, records)

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
    const stats = await getEmailStats(+campaignId)
    return res.json(stats)
  } catch (err) {
    next(err)
  }
}

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
 *                type: object
 *                properties:
 *                  campaign:
 *                    $ref: '#/components/schemas/EmailCampaign'
 *                  num_recipients:
 *                    type: number
 *        "400" :
 *           description: Invalid campaign type or not owned by user
 *        "401":
 *           description: Unauthorized
 *        "500":
 *           description: Internal Server Error
 */
router.get('/', getCampaignDetails)

/**
 * @swagger
 * path:
 *   /campaign/{campaignId}/email/template:
 *     put:
 *       tags:
 *         - Email
 *       summary: Stores body template for email campaign
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
 *                 subject:
 *                   type: string
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
 *                   template:
 *                     type: object
 *                     properties:
 *                       subject:
 *                         type: string
 *                       body:
 *                         type: string
 *                       params:
 *                         type: array
 *                         items:
 *                           type: string 
 *
 *         "400":
 *           description: Bad Request
 *         "401":
 *           description: Unauthorized
 *         "403":
 *           description: Forbidden as there is a job in progress 
 *         "500":
 *           description: Internal Server Error
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
 *         - name: mime_type
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
 *                   presigned_url:
 *                     type: string
 *                   transaction_id:
 *                     type: string
 *         "400" :
 *           description: Bad Request
 *         "401":
 *           description: Unauthorized
 *         "403":
 *           description: Forbidden as there is a job in progress 
 *         "500":
 *           description: Internal Server Error
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
 *                 - transaction_id
 *                 - filename
 *               properties:
 *                 transaction_id:
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
 *                     type: number
 *                   preview:
 *                     type: object
 *                     properties:
 *                       subject:
 *                         type: string
 *                       body:
 *                         type: string
 *         "400" :
 *           description: Bad Request
 *         "401":
 *           description: Unauthorized
 *         "403":
 *           description: Forbidden as there is a job in progress 
 *         "500":
 *           description: Internal Server Error
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
 *        "400" :
 *           description: Bad Request
 *        "401":
 *           description: Unauthorized
 *        "403":
 *           description: Forbidden as there is a job in progress 
 *        "500":
 *           description: Internal Server Error
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
 *                      subject: 
 *                        type: string
 *        "401":
 *           description: Unauthorized
 *        "500":
 *           description: Internal Server Error
 */
router.get('/preview', previewFirstMessage)

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
 *                properties:
 *                 campaign_id:
 *                  type: integer
 *                 job_id:
 *                  type: array
 *                  items:
 *                    type: number
 *        "400" :
 *           description: Bad Request
 *        "401":
 *           description: Unauthorized
 *        "403":
 *           description: Forbidden as there is a job in progress 
 *        "500":
 *           description: Internal Server Error
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
 *                properties:
 *                 campaign_id:
 *                  type: integer
 *        "401":
 *           description: Unauthorized
 *        "500":
 *           description: Internal Server Error
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
 *                properties:
 *                 campaign_id:
 *                  type: integer
 *        "401":
 *           description: Unauthorized
 *        "403":
 *           description: Forbidden as there is a job in progress 
 *        "500":
 *           description: Internal Server Error
 */
router.post('/retry', canEditCampaign, retryCampaign)

/**
 * @swagger
 * path:
*  /campaign/{campaignId}/email/stats:
 *    get:
 *      tags:
 *        - Email
 *      summary: Get email campaign stats
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
 *        "401":
 *           description: Unauthorized
 *        "500":
 *           description: Internal Server Error
 */
router.get('/stats', campaignStatsHandler)

export default router
