import { Request, Response, NextFunction } from 'express'
import logger from '@core/logger'
import S3Client from '@core/services/s3-client.class'
import {
  MissingTemplateKeysError,
  HydrationError,
  RecipientColumnMissing,
  InvalidRecipientError,
  UnexpectedDoubleQuoteError,
} from '@core/errors'
import { TemplateError } from 'postman-templating'
import { CampaignService, TemplateService, StatsService } from '@core/services'
import { SmsTemplateService, SmsService } from '@sms/services'
import { StoreTemplateOutput } from '@sms/interfaces'
import { Campaign } from '@core/models'

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
        num_recipients: 0,
        valid: false,
        template: {
          body: updatedTemplate?.body,

          params: updatedTemplate?.params,
        },
      })
    } else {
      const numRecipients = await StatsService.getNumRecipients(+campaignId)
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
 * Updates the campaign and sms_messages table in a transaction, rolling back when either fails.
 * For campaign table, the s3 meta data is updated with the uploaded file, and its validity is set to true.
 * For sms_messages table, existing records are deleted and new ones are bulk inserted.
 * Then update statistics with new unsent count
 * @param key
 * @param campaignId
 * @param filename
 * @param records
 */
const updateCampaignAndMessages = async (
  campaignId: number,
  key: string,
  filename: string,
  records: MessageBulkInsertInterface[]
): Promise<void> => {
  let transaction

  try {
    transaction = await Campaign.sequelize?.transaction()
    // Updates metadata in project
    await TemplateService.replaceCampaignS3Metadata(
      campaignId,
      key,
      filename,
      transaction
    )

    // START populate template
    await SmsTemplateService.addToMessageLogs(campaignId, records, transaction)

    // Update statistic table
    await StatsService.setNumRecipients(campaignId, records.length, transaction)

    // Set campaign to valid
    await CampaignService.setValid(campaignId, transaction)

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
  try {
    const { campaignId } = req.params

    // extract s3Key from transactionId
    const { transaction_id: transactionId, filename } = req.body
    const s3Key = TemplateService.extractS3Key(transactionId)

    // check if template exists
    const smsTemplate = await SmsTemplateService.getFilledTemplate(+campaignId)
    if (smsTemplate === null) {
      throw new Error('Template does not exist, please create a template')
    }

    const s3Client = new S3Client()
    const fileContent = await s3Client.getCsvFile(s3Key)

    const records = TemplateService.getRecordsFromCsv(
      +campaignId,
      fileContent,
      smsTemplate.params as string[]
    )

    await SmsTemplateService.testHydration(records, smsTemplate.body as string)

    if (SmsTemplateService.hasInvalidSmsRecipient(records)) {
      throw new InvalidRecipientError()
    }

    // Store temp filename
    await TemplateService.storeS3TempFilename(+campaignId, filename)

    try {
      // Return early because bulk insert is slow
      res.sendStatus(202)

      // Slow bulk insert
      await updateCampaignAndMessages(+campaignId, s3Key, filename, records)
    } catch (err) {
      // Do not return any response since it has already been sent
      logger.error(
        `Error storing messages for campaign ${campaignId}. ${err.stack}`
      )
      // Store error to return on poll
      TemplateService.storeS3Error(+campaignId, err.message)
    }
  } catch (err) {
    const userErrors = [
      RecipientColumnMissing,
      MissingTemplateKeysError,
      InvalidRecipientError,
      UnexpectedDoubleQuoteError,
    ]

    if (userErrors.some((errType) => err instanceof errType)) {
      return res.status(400).json({ message: err.message })
    }
    return next(err)
  }
}

/*
 * Returns status of csv processing
 */
const pollCsvStatusHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { campaignId } = req.params
    const {
      isCsvProcessing,
      filename,
      tempFilename,
      error,
    } = await TemplateService.getCsvStatus(+campaignId)

    // If done processing, returns num recipients and preview msg
    let numRecipients, preview
    if (!isCsvProcessing) {
      ;[numRecipients, preview] = await Promise.all([
        StatsService.getNumRecipients(+campaignId),
        SmsService.getHydratedMessage(+campaignId),
      ])
    }

    res.json({
      is_csv_processing: isCsvProcessing,
      csv_filename: filename,
      temp_csv_filename: tempFilename,
      csv_error: error,
      num_recipients: numRecipients,
      preview,
    })
  } catch (err) {
    next(err)
  }
}

/*
 * Deletes csv error and temp csv name from db
 */
const deleteCsvErrorHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { campaignId } = req.params
    await TemplateService.deleteS3TempKeys(+campaignId)
    res.sendStatus(200)
  } catch (e) {
    next(e)
  }
}

export const SmsTemplateMiddleware = {
  storeTemplate,
  uploadCompleteHandler,
  pollCsvStatusHandler,
  deleteCsvErrorHandler,
}
