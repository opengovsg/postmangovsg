import { Handler, NextFunction, Request, Response } from 'express'
import {
  HydrationError,
  InvalidRecipientError,
  MissingTemplateKeysError,
  RecipientColumnMissing,
  UserError,
} from '@core/errors'
import { TemplateError } from '@shared/templating'
import {
  AuthService,
  ListService,
  StatsService,
  UnsubscriberService,
  UploadService,
} from '@core/services'
import { EmailService, EmailTemplateService } from '@email/services'
import { StoreTemplateOutput } from '@email/interfaces'
import { loggerWithLabel } from '@core/logger'
import { ThemeClient } from '@shared/theme'
import { ChannelType } from '@core/constants'
import { ApiInvalidTemplateError } from '@core/errors/rest-api.errors'
import { PhonebookService } from '@core/services/phonebook.service'

export interface EmailTemplateMiddleware {
  storeTemplate: Handler
  uploadCompleteHandler: Handler
  pollCsvStatusHandler: Handler
  deleteCsvErrorHandler: Handler
  uploadProtectedCompleteHandler: Handler
  selectListHandler: Handler
  selectPhonebookListHandler: Handler
}

export const InitEmailTemplateMiddleware = (
  authService: AuthService
): EmailTemplateMiddleware => {
  const logger = loggerWithLabel(module)
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
      const { check, valid, updatedTemplate }: StoreTemplateOutput =
        await EmailTemplateService.storeTemplate({
          campaignId: +campaignId,
          subject,
          body,
          replyTo:
            replyTo ||
            (
              await authService.findUser(req.session?.user?.id)
            )?.email,
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
      const template = await EmailTemplateService.getFilledTemplate(+campaignId)
      if (template === null) {
        throw new Error(
          'Error: No message template found. Please create a message template before uploading a recipient file.'
        )
      }

      // Store temp filename
      await UploadService.storeS3TempFilename(+campaignId, filename)

      // Enqueue upload job to be processed
      await EmailTemplateService.enqueueUpload({
        campaignId: +campaignId,
        template,
        s3Key,
        etag,
        filename,
      })

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

  /**
   * TODO: Refactor and cleanup
   * Set selected list and populate the EmailMessages table
   * @param req
   * @param res
   * @param next
   */
  const selectListHandler = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    const CHANNEL_TYPE = ChannelType.Email
    const userId = req.session?.user?.id
    const { campaignId } = req.params

    const { list_id: listId } = req.body
    const logMeta = { campaignId, action: 'selectListHandler' }

    try {
      const list = await ListService.getList({
        listId,
        userId,
        channel: CHANNEL_TYPE,
      })
      if (!list) throw new Error('Error: List not found')

      const { s3key: s3Key, etag, filename } = list

      // check if template exists
      const template = await EmailTemplateService.getFilledTemplate(+campaignId)
      if (template === null) {
        throw new Error(
          'Error: No message template found. Please create a message template before uploading a recipient file.'
        )
      }

      // Store temp filename
      await UploadService.storeS3TempFilename(+campaignId, filename)

      // Enqueue upload job to be processed
      await EmailTemplateService.enqueueUpload({
        campaignId: +campaignId,
        template,
        s3Key,
        etag,
        filename,
      })

      res.status(202).json({ list_id: listId })
    } catch (err) {
      logger.error({
        message: 'Failed to select managed list',
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
      const template = await EmailTemplateService.getFilledTemplate(+campaignId)
      if (template === null) {
        throw new Error(
          'Error: No message template found. Please create a message template before uploading a recipient file.'
        )
      }

      const { presignedUrl } = await UploadService.getPresignedUrl()

      const list = await PhonebookService.getPhonebookListById({
        listId,
        presignedUrl,
      })
      if (!list) throw new Error('Error: List not found')

      const { s3Key, etag, filename } = list

      // Store temp filename
      await UploadService.storeS3TempFilename(+campaignId, filename)

      // Enqueue upload job to be processed
      await EmailTemplateService.enqueueUpload({
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
    res: Response
  ): Promise<Response> => {
    const { campaignId } = req.params
    await UploadService.deleteS3TempKeys(+campaignId)
    return res.status(200).json({ id: campaignId })
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

      // Enqueue upload job to be processed
      const { etag } = res.locals
      await EmailTemplateService.enqueueUpload(
        {
          campaignId: +campaignId,
          template,
          s3Key,
          etag,
          filename,
        },
        true
      )

      res.status(202).json({ transaction_id: transactionId })
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
        throw new ApiInvalidTemplateError((err as Error).message)
      }
      return next(err)
    }
  }

  return {
    storeTemplate,
    uploadCompleteHandler,
    pollCsvStatusHandler,
    deleteCsvErrorHandler,
    uploadProtectedCompleteHandler,
    selectPhonebookListHandler,
    selectListHandler,
  }
}
