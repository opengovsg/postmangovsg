import { Request, Response, NextFunction } from 'express'
import retry from 'async-retry'
import S3Client from '@core/services/s3-client.class'
import {
  MissingTemplateKeysError,
  HydrationError,
  RecipientColumnMissing,
  InvalidRecipientError,
  UserError,
} from '@core/errors'
import { TemplateError } from 'postman-templating'
import { UploadService, StatsService, ParseCsvService } from '@core/services'
import { SmsTemplateService, SmsService } from '@sms/services'
import { StoreTemplateOutput } from '@sms/interfaces'
import { Campaign } from '@core/models'
import Logger from '@core/logger'

const logger = Logger.loggerWithLabel(module)
const RETRY_CONFIG = {
  retries: 3,
  minTimeout: 1000,
  maxTimeout: 3 * 1000,
  factor: 1,
}
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
  const { campaignId } = req.params
  const { body } = req.body
  const logMeta = { campaignId, action: 'storeTemplate' }
  try {
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
      logger.info({
        message:
          'SMS template has changed, required to re-upload recipient list',
        ...logMeta,
      })
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
      logger.info({ message: 'SMS template updated', ...logMeta })
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
      logger.error({
        message: 'Failed to store template',
        error: err,
        ...logMeta,
      })
      return res.status(400).json({ message: err.message })
    }
    return next(err)
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
  const { campaignId } = req.params

  // extract s3Key from transactionId
  const { transaction_id: transactionId, filename, etag } = req.body
  const logMeta = { campaignId, action: 'uploadCompleteHandler' }

  try {
    const { s3Key } = UploadService.extractParamsFromJwt(transactionId)

    // check if template exists
    const template = await SmsTemplateService.getFilledTemplate(+campaignId)
    if (template === null) {
      throw new Error('Template does not exist, please create a template')
    }

    // Store temp filename
    await UploadService.storeS3TempFilename(+campaignId, filename)

    logger.info({ message: 'Stored temporary S3 filename', ...logMeta })
    // Return early because bulk insert is slow
    res.sendStatus(202)

    try {
      // - download from s3
      const s3Client = new S3Client()
      await retry(async (bail) => {
        logger.info({
          message: 'Start to parse and process s3 file',
          ...logMeta,
        })
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const transaction = await Campaign.sequelize!.transaction()

        const downloadStream = s3Client.download(s3Key, etag)
        const params = {
          transaction,
          template,
          campaignId: +campaignId,
        }
        await ParseCsvService.parseAndProcessCsv(
          downloadStream,
          SmsService.uploadCompleteOnPreview(params),
          SmsService.uploadCompleteOnChunk(params),
          UploadService.uploadCompleteOnComplete({
            ...params,
            key: s3Key,
            filename,
          })
        ).catch((e) => {
          transaction.rollback()
          logger.error({
            message: 'Failed to process S3 file',
            s3Key,
            error: e,
            ...logMeta,
          })
          if (e.code !== 'NoSuchKey') {
            bail(e)
          } else {
            throw e
          }
        })
      }, RETRY_CONFIG)
    } catch (err) {
      // Do not return any response since it has already been sent
      logger.error({
        message: 'Error storing messages for campaign',
        s3Key,
        error: err,
        ...logMeta,
      })

      // Precondition failure is caused by ETag mismatch. Convert to a more user-friendly error message.
      if (err.code === 'PreconditionFailed') {
        err.message =
          'Please try again. Error processing the recipient list. Please contact the Postman team if this problem persists.'
      }

      // Store error to return on poll
      UploadService.storeS3Error(+campaignId, err.message)
    }
  } catch (err) {
    logger.error({
      message: 'Failed to complete upload to s3',
      error: err,
      ...logMeta,
    })
    const userErrors = [
      UserError,
      RecipientColumnMissing,
      MissingTemplateKeysError,
      InvalidRecipientError,
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
    } = await UploadService.getCsvStatus(+campaignId)

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
    await UploadService.deleteS3TempKeys(+campaignId)
    logger.info({
      message: 'Deleted csv error and temp filename from db',
      campaignId,
      action: 'deleteCsvErrorHandler',
    })
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
