import { Request, Response, NextFunction } from 'express'
import retry from 'async-retry'
import logger from '@core/logger'
import {
  MissingTemplateKeysError,
  HydrationError,
  RecipientColumnMissing,
  InvalidRecipientError,
  UserError,
} from '@core/errors'
import { TemplateError } from 'postman-templating'
import { UploadService, StatsService, ParseCsvService } from '@core/services'
import { EmailTemplateService, EmailService } from '@email/services'
import S3Client from '@core/services/s3-client.class'
import { StoreTemplateOutput } from '@email/interfaces'
import { Campaign } from '@core/models'
const RETRY_CONFIG = {
  retries: 3,
  minTimeout: 1000,
  maxTimeout: 3 * 1000,
  factor: 1,
}
/**
 * Store template subject and body in email template table.
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
    const { subject, body, reply_to: replyTo } = req.body
    const {
      check,
      valid,
      updatedTemplate,
    }: StoreTemplateOutput = await EmailTemplateService.storeTemplate({
      campaignId: +campaignId,
      subject,
      body,
      replyTo,
    })

    if (check?.reupload) {
      return res.json({
        message:
          'Please re-upload your recipient list as template has changed.',
        extra_keys: check.extraKeys,
        num_recipients: 0,
        valid: false,
        template: {
          body: updatedTemplate?.body,
          subject: updatedTemplate?.subject,
          params: updatedTemplate?.params,
          reply_to: updatedTemplate?.replyTo,
        },
      })
    } else {
      const numRecipients = await StatsService.getNumRecipients(+campaignId)
      return res.json({
        message: `Template for campaign ${campaignId} updated`,
        valid: valid,
        num_recipients: numRecipients,
        template: {
          body: updatedTemplate?.body,
          subject: updatedTemplate?.subject,
          params: updatedTemplate?.params,
          reply_to: updatedTemplate?.replyTo,
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
    const { s3Key } = UploadService.extractParamsFromJwt(transactionId)

    // check if template exists
    const template = await EmailTemplateService.getFilledTemplate(+campaignId)
    if (template === null) {
      throw new Error('Template does not exist, please create a template')
    }

    // Store temp filename
    await UploadService.storeS3TempFilename(+campaignId, filename)

    // Return early because bulk insert is slow
    res.sendStatus(202)

    try {
      // Continue processing
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const transaction = await Campaign.sequelize!.transaction()
      // - download from s3
      const s3Client = new S3Client()
      await retry(async (bail) => {
        const downloadStream = s3Client.download(s3Key)
        const params = {
          transaction,
          template,
          campaignId: +campaignId,
        }

        await ParseCsvService.parseAndProcessCsv(
          downloadStream,
          EmailService.uploadCompleteOnPreview(params),
          EmailService.uploadCompleteOnChunk(params),
          UploadService.uploadCompleteOnComplete({
            ...params,
            key: s3Key,
            filename,
          })
        ).catch((e) => {
          if (e.code !== 'NoSuchKey') {
            bail(e)
          } else {
            throw e
          }
        })
      }, RETRY_CONFIG)
    } catch (err) {
      // Do not return any response since it has already been sent
      logger.error(
        `Error storing messages for campaign ${campaignId}. ${err.stack}`
      )
      // Store error to return on poll
      UploadService.storeS3Error(+campaignId, err.message)
    }
  } catch (err) {
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
        EmailService.getHydratedMessage(+campaignId),
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
    res.sendStatus(200)
  } catch (e) {
    next(e)
  }
}

// TODO: refactor this handler with uploadCompleteHandler to share the same function
/**
 * Downloads the file from s3 and checks that its columns match the attributes provided in the template.
 * If a template has not yet been uploaded, do not write to the message logs, but prompt the user to upload a template first.
 * If the template and csv do not match, prompt the user to upload a new file.
 * @param req
 * @param res
 * @param next
 */
const uploadProtectedCompleteHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { campaignId } = req.params

    // extract s3Key from transactionId
    const { transaction_id: transactionId, filename } = req.body
    const { s3Key } = UploadService.extractParamsFromJwt(transactionId) as {
      s3Key: string
      uploadId: string
    }

    // check if template exists
    const template = await EmailTemplateService.getFilledTemplate(+campaignId)
    if (template === null) {
      throw new Error('Template does not exist, please create a template')
    }

    // Store temp filename
    await UploadService.storeS3TempFilename(+campaignId, filename)
    // Return early because bulk insert is slow
    res.sendStatus(202)

    // Slow bulk insert
    try {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const transaction = await Campaign.sequelize!.transaction()
      //Download from s3
      const s3Client = new S3Client()
      await retry(async (bail) => {
        const downloadStream = s3Client.download(s3Key)
        const params = {
          transaction,
          template,
          campaignId: +campaignId,
        }

        await ParseCsvService.parseAndProcessCsv(
          downloadStream,
          EmailService.uploadProtectedCompleteOnPreview(params),
          EmailService.uploadProtectedCompleteOnChunk(params),
          UploadService.uploadCompleteOnComplete({
            ...params,
            key: s3Key,
            filename,
          })
        ).catch((e) => {
          if (e.code !== 'NoSuchKey') {
            bail(e)
          } else {
            throw e
          }
        })
      }, RETRY_CONFIG)
    } catch (err) {
      // Do not return any response since it has already been sent
      logger.error(
        `Error storing messages for campaign ${campaignId}. ${err.stack}`
      )
      // Store error to return on poll
      UploadService.storeS3Error(+campaignId, err.message)
    }
  } catch (err) {
    const userErrors = [
      RecipientColumnMissing,
      MissingTemplateKeysError,
      InvalidRecipientError,
      UserError,
    ]

    if (userErrors.some((errType) => err instanceof errType)) {
      return res.status(400).json({ message: err.message })
    }
    return next(err)
  }
}

export const EmailTemplateMiddleware = {
  storeTemplate,
  uploadCompleteHandler,
  pollCsvStatusHandler,
  deleteCsvErrorHandler,
  uploadProtectedCompleteHandler,
}
