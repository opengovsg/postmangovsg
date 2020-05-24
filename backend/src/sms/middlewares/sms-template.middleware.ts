import { Request, Response, NextFunction } from 'express'
import config from '@core/config'
import logger from '@core/logger'
import {
  MissingTemplateKeysError,
  HydrationError,
  RecipientColumnMissing,
  TemplateError,
  InvalidRecipientError,
} from '@core/errors'
import { CampaignService, TemplateService } from '@core/services'
import { SmsTemplateService } from '@sms/services'
import { StoreTemplateOutput } from '@sms/interfaces'
import { Campaign } from '@core/models'

const uploadTimeout = Number(config.get('express.uploadCompleteTimeout'))

/**
 * Store template subject and body in sms template table.
 * If an existing csv has been uploaded for this campaign but whose columns do not match the attributes provided in the new template,
 * delete the old csv, and prompt user to upload a new csv.
 * @param req
 * @param res
 * @param next
 */
const storeTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { campaignId } = req.params
    const { body } = req.body
    // extract params from template, save to db (this will be done with hook)
    const {
      check,
      numRecipients,
      valid,
      updatedTemplate,
    }: StoreTemplateOutput = await SmsTemplateService.storeTemplate({
      campaignId: +campaignId,
      body,
    })

    if (check?.reupload) {
      return res.status(200).json({
        message:
          'Please re-upload your recipient list as template has changed.',
        extra_keys: check.extraKeys,
        num_recipients: numRecipients,
        valid: false,
        template: {
          body: updatedTemplate?.body,

          params: updatedTemplate?.params,
        },
      })
    } else {
      return res.status(200).json({
        message: `Template for campaign ${campaignId} updated`,
        valid: valid,
        num_recipients: numRecipients,
        template: {
          body: updatedTemplate?.body,
          params: updatedTemplate?.params,
        },
      })
    }
  } catch (err) {
    if (err instanceof HydrationError || err instanceof TemplateError) {
      return res.status(400).json({ message: err.message })
    }
    return next(err)
  }
}

/**
 * Updates the campaign and email_messages table in a transaction, rolling back when either fails.
 * For campaign table, the s3 meta data is updated with the uploaded file, and its validity is set to true.
 * For email_messages table, existing records are deleted and new ones are bulk inserted.
 * @param key
 * @param campaignId
 * @param filename
 * @param records
 */
const updateCampaignAndMessages = async (
  key: string,
  campaignId: string,
  filename: string,
  records: MessageBulkInsertInterface[]
): Promise<void> => {
  let transaction

  try {
    transaction = await Campaign.sequelize?.transaction()
    // Updates metadata in project
    await CampaignService.updateCampaignS3Metadata(
      key,
      campaignId,
      filename,
      transaction
    )

    // START populate template
    await SmsTemplateService.addToMessageLogs(+campaignId, records, transaction)

    // Set campaign to valid
    await CampaignService.setValid(+campaignId, transaction)

    transaction?.commit()
  } catch (err) {
    transaction?.rollback()
    throw err
  }
}

/**
 * Downloads the file from s3 and checks that its columns match the attributes provided in the template.
 * If a template has not yet been uploaded, do not write to the message logs, but prompt the user to upload a template first.
 * If the template and csv do not match, prompt the user to upload a new file.
 * @param req
 * @param res
 * @param next
 */
const uploadCompleteHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  res.setTimeout(uploadTimeout, async () => {
    if (!res.headersSent) {
      return res.status(408).json('Request timed out')
    }
    return
  })
  try {
    const { campaignId } = req.params
    // TODO: validate if project is in editable state

    // extract s3Key from transactionId
    const { transaction_id: transactionId, filename } = req.body
    const s3Key: string = TemplateService.extractS3Key(transactionId)

    // check if template exists
    const smsTemplate = await SmsTemplateService.getFilledTemplate(+campaignId)
    if (smsTemplate === null) {
      throw new Error('Template does not exist, please create a template')
    }

    // carry out templating / hydration
    // - download from s3
    try {
      const {
        records,
        hydratedRecord,
      } = await SmsTemplateService.client.testHydration({
        campaignId: +campaignId,
        s3Key,
        templateBody: smsTemplate.body as string,
        templateParams: smsTemplate.params as string[],
      })

      if (SmsTemplateService.hasInvalidSmsRecipient(records))
        throw new InvalidRecipientError()

      const recipientCount = records.length

      await updateCampaignAndMessages(s3Key, campaignId, filename, records)

      if (!res.headersSent) {
        return res.json({
          num_recipients: recipientCount,
          preview: hydratedRecord,
        })
      }
    } catch (err) {
      logger.error(
        `Error parsing file for campaign ${campaignId}. ${err.stack}`
      )
      throw err
    }
  } catch (err) {
    if (!res.headersSent) {
      if (
        err instanceof RecipientColumnMissing ||
        err instanceof MissingTemplateKeysError ||
        err instanceof InvalidRecipientError
      ) {
        return res.status(400).json({ message: err.message })
      }
      return next(err)
    }
  }
}

export const SmsTemplateMiddleware = {
  storeTemplate,
  uploadCompleteHandler,
}
