import { NextFunction, Request, Response } from 'express'
import {
  HydrationError,
  InvalidRecipientError,
  MissingTemplateKeysError,
  RecipientColumnMissing,
  UserError,
} from '@core/errors'
import { TemplateError } from '@shared/templating'
import { StatsService, UploadService } from '@core/services'
import { SmsService, SmsTemplateService } from '@sms/services'
import { StoreTemplateOutput } from '@sms/interfaces'
import { loggerWithLabel } from '@core/logger'
import { ApiInvalidTemplateError } from '@core/errors/rest-api.errors'
import { PhonebookService } from '@core/services/phonebook.service'

const logger = loggerWithLabel(module)
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
    const { check, valid, updatedTemplate }: StoreTemplateOutput =
      await SmsTemplateService.storeTemplate({
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

    // check if template exists
    const template = await SmsTemplateService.getFilledTemplate(+campaignId)
    if (template === null) {
      throw new Error(
        'Error: No message template found. Please create a message template before uploading a recipient file.'
      )
    }

    // Store temp filename
    await UploadService.storeS3TempFilename(+campaignId, filename)

    logger.info({ message: 'Stored temporary S3 filename', ...logMeta })

    // Enqueue upload job to be processed
    await SmsTemplateService.enqueueUpload({
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

const selectPhonebookListHandler = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { campaignId } = req.params

    const { list_id: listId } = req.body

    // check if template exists
    const template = await SmsTemplateService.getFilledTemplate(+campaignId)
    if (template === null) {
      throw new Error(
        'Error: No message template found. Please create a message template before uploading a recipient file.'
      )
    }
    const { s3Key, presignedUrl } = await UploadService.getPresignedUrl()

    const list = await PhonebookService.getPhonebookListById({
      listId,
      presignedUrl,
    })
    if (!list) throw new Error('Error: List not found')

    const { etag, filename } = list

    // Store temp filename
    await UploadService.storeS3TempFilename(+campaignId, filename)

    // Enqueue upload job to be processed
    await SmsTemplateService.enqueueUpload({
      campaignId: +campaignId,
      template,
      s3Key,
      etag,
      filename,
    })

    return res.status(202).json({ list_id: listId })
  } catch (e) {
    // explicitly return a 500 to not block user flow but prompt them to upload an alternative csv
    return res.status(500).json({
      message:
        'Error selecting phonebook list. Please try uploading the list directly.',
    })
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
    const { isCsvProcessing, filename, tempFilename, error } =
      await UploadService.getCsvStatus(+campaignId)

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
  res: Response
): Promise<Response> => {
  const { campaignId } = req.params
  await UploadService.deleteS3TempKeys(+campaignId)
  return res.status(200).json({ id: campaignId })
}

const setPhonebookListAssociationHandler = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { campaignId } = req.params
  const { list_id: listId } = req.body
  await PhonebookService.setPhonebookListForCampaign({
    campaignId: +campaignId,
    listId,
  })
  return res.sendStatus(204)
}

const deletePhonebookListAssociationHandler = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { campaignId } = req.params
  await PhonebookService.deletePhonebookListForCampaign(+campaignId)
  return res.sendStatus(204)
}

const getPhonebookListIdForCampaignHandler = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { campaignId } = req.params
  const phonebookListId = await PhonebookService.getPhonebookListIdForCampaign(
    +campaignId
  )
  if (phonebookListId) {
    return res.json({ list_id: phonebookListId })
  }
  return res.json({
    message: 'No managed_list_id associated with this campaign',
  })
}

export const SmsTemplateMiddleware = {
  storeTemplate,
  uploadCompleteHandler,
  pollCsvStatusHandler,
  deleteCsvErrorHandler,
  selectPhonebookListHandler,
  setPhonebookListAssociationHandler,
  deletePhonebookListAssociationHandler,
  getPhonebookListIdForCampaignHandler,
}
