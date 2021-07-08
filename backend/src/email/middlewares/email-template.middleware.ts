import { Request, Response, NextFunction } from 'express'
import retry from 'async-retry'
import {
  MissingTemplateKeysError,
  HydrationError,
  RecipientColumnMissing,
  InvalidRecipientError,
  UserError,
} from '@core/errors'
import { TemplateError } from '@shared/templating'
import {
  AuthService,
  UploadService,
  StatsService,
  ParseCsvService,
  UnsubscriberService,
} from '@core/services'
import { EmailTemplateService, EmailService } from '@email/services'
import S3Client from '@core/services/s3-client.class'
import { StoreTemplateOutput } from '@email/interfaces'
import { Campaign } from '@core/models'
import { loggerWithLabel } from '@core/logger'
import { ThemeClient } from '@shared/theme'

const logger = loggerWithLabel(module)
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
  const { campaignId } = req.params
  const {
    subject,
    body,
    reply_to: replyTo,
    from,
    show_logo: showLogo,
  } = req.body
  const logMeta = { campaignId, action: 'storeTemplate' }
  try {
    const {
      check,
      valid,
      updatedTemplate,
    }: StoreTemplateOutput = await EmailTemplateService.storeTemplate({
      campaignId: +campaignId,
      subject,
      body,
      replyTo:
        replyTo || (await AuthService.findUser(req.session?.user?.id))?.email,
      from,
      showLogo,
    })

    const template = {
      body: updatedTemplate?.body,
      subject: updatedTemplate?.subject,
      params: updatedTemplate?.params,
      reply_to: updatedTemplate?.replyTo,
      from: updatedTemplate?.from,
      show_logo: updatedTemplate?.showLogo,
    }

    if (check?.reupload) {
      logger.info({
        message:
          'Email template has changed, required to re-upload recipient list',
        ...logMeta,
      })
      return res.json({
        message:
          'Please re-upload your recipient list as template has changed.',
        extra_keys: check.extraKeys,
        num_recipients: 0,
        valid: false,
        template,
      })
    } else {
      const numRecipients = await StatsService.getNumRecipients(+campaignId)
      return res.json({
        message: `Template for campaign ${campaignId} updated`,
        valid: valid,
        num_recipients: numRecipients,
        template,
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
    const template = await EmailTemplateService.getFilledTemplate(+campaignId)
    if (template === null) {
      throw new Error(
        'Error: No message template found. Please create a message template before uploading a recipient file.'
      )
    }

    // Store temp filename
    await UploadService.storeS3TempFilename(+campaignId, filename)

    // Return early because bulk insert is slow
    res.sendStatus(202)

    try {
      // Continue processing

      // - download from s3
      const s3Client = new S3Client()
      await retry(async (bail) => {
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
          EmailService.uploadCompleteOnPreview(params),
          EmailService.uploadCompleteOnChunk(params),
          UploadService.uploadCompleteOnComplete({
            ...params,
            key: s3Key,
            filename,
          })
        ).catch((e) => {
          transaction.rollback()
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
    let numRecipients, preview, themedBody

    if (!isCsvProcessing) {
      ;[numRecipients, preview] = await Promise.all([
        StatsService.getNumRecipients(+campaignId),
        EmailService.getHydratedMessage(+campaignId),
      ])

      if (preview !== undefined) {
        const { body, agencyName, agencyLogoURI, showMasthead } = preview
        themedBody = await ThemeClient.generateThemedBody({
          body,
          unsubLink: UnsubscriberService.generateTestUnsubLink(),
          agencyName,
          agencyLogoURI,
          showMasthead,
        })
      }
    }

    res.json({
      is_csv_processing: isCsvProcessing,
      csv_filename: filename,
      temp_csv_filename: tempFilename,
      csv_error: error,
      num_recipients: numRecipients,
      preview: {
        ...preview,
        themedBody,
      },
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
  const { campaignId } = req.params
  // extract s3Key from transactionId
  const { transaction_id: transactionId, filename } = req.body
  const logMeta = { campaignId, action: 'uploadProtectedCompleteHandler' }

  try {
    const { s3Key } = UploadService.extractParamsFromJwt(transactionId) as {
      s3Key: string
      uploadId: string
    }

    // check if template exists
    const template = await EmailTemplateService.getFilledTemplate(+campaignId)
    if (template === null) {
      throw new Error(
        'Error: No message template found. Please create a message template before uploading a recipient file.'
      )
    }

    // Store temp filename
    await UploadService.storeS3TempFilename(+campaignId, filename)
    // Return early because bulk insert is slow
    res.sendStatus(202)

    // Slow bulk insert
    try {
      //Download from s3
      const s3Client = new S3Client()
      await retry(async (bail) => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const transaction = await Campaign.sequelize!.transaction()

        const { etag } = res.locals
        const downloadStream = s3Client.download(s3Key, etag)
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
          logger.error({
            message: 'Failed to process S3 file',
            s3Key,
            error: e,
            ...logMeta,
          })
          transaction.rollback()
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
