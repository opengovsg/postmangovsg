import { Request, Response, NextFunction } from 'express'
import {
  MissingTemplateKeysError,
  HydrationError,
  RecipientColumnMissing,
  InvalidRecipientError,
  UserError,
} from '@core/errors'
import { TemplateError } from '@shared/templating'
import { UploadService, StatsService } from '@core/services'
import { TelegramService, TelegramTemplateService } from '@telegram/services'
import { loggerWithLabel } from '@core/logger'
import { ApiInvalidTemplateError } from '@core/errors/rest-api.errors'

const logger = loggerWithLabel(module)

/**
 * Store template subject and body in Telegram template table.
 * If an existing csv has been uploaded for this campaign but whose columns do not match the
 * attributes provided in the new template, delete the old csv, and prompt user to upload a
 * new csv.
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
    const { check, valid, updatedTemplate } =
      await TelegramTemplateService.storeTemplate({
        campaignId: +campaignId,
        body,
      })

    if (check?.reupload) {
      logger.info({
        message:
          'Telegram template has changed, required to re-upload recipient list',
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
      return res.status(200).json({
        message: `Template for campaign ${campaignId} updated`,
        valid: valid,
        template: {
          body: updatedTemplate?.body,
          params: updatedTemplate?.params,
        },
      })
    }
  } catch (err) {
    if (err instanceof HydrationError || err instanceof TemplateError) {
      throw new ApiInvalidTemplateError(err.message)
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

    const template = await TelegramTemplateService.getFilledTemplate(
      +campaignId
    )
    if (template === null) {
      throw new Error(
        'Error: No message template found. Please create a message template before uploading a recipient file.'
      )
    }

    // Store temp filename
    await UploadService.storeS3TempFilename(+campaignId, filename)

    // Enqueue upload job to be processed
    await TelegramTemplateService.enqueueUpload({
      campaignId: +campaignId,
      template,
      s3Key,
      etag,
      filename,
    })

    // Return early because bulk insert is slow
    res.status(202).json({ id: campaignId })
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
      throw new ApiInvalidTemplateError((err as Error).message)
    }
    return next(err)
  }
}

/*
 * Returns status of csv processing
 */
const pollCsvStatusHandler = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { campaignId } = req.params
  const { isCsvProcessing, filename, tempFilename, error } =
    await UploadService.getCsvStatus(+campaignId)

  // If done processing, returns num recipients and preview msg
  let numRecipients, preview
  if (!isCsvProcessing) {
    ;[numRecipients, preview] = await Promise.all([
      StatsService.getNumRecipients(+campaignId),
      TelegramService.getHydratedMessage(+campaignId),
    ])
  }

  return res.json({
    is_csv_processing: isCsvProcessing,
    csv_filename: filename,
    temp_csv_filename: tempFilename,
    csv_error: error,
    num_recipients: numRecipients,
    preview,
  })
}

/*
 * Deletes csv error and temp csv name from db
 */
const deleteCsvErrorHandler = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { campaignId } = req.params
  await UploadService.deleteS3TempKeys(+campaignId)
  return res.status(200).json({ id: campaignId })
}

export const TelegramTemplateMiddleware = {
  storeTemplate,
  uploadCompleteHandler,
  pollCsvStatusHandler,
  deleteCsvErrorHandler,
}
