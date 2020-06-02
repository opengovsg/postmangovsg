import { Request, Response, NextFunction } from 'express'
import logger from '@core/logger'
import {
  MissingTemplateKeysError,
  HydrationError,
  RecipientColumnMissing,
  TemplateError,
  InvalidRecipientError,
} from '@core/errors'
import { CampaignService, TemplateService } from '@core/services'
import { EmailTemplateService } from '@email/services'
import { StoreTemplateOutput } from '@email/interfaces'
import { Campaign } from '@core/models'
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
      numRecipients,
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
        num_recipients: numRecipients,
        valid: false,
        template: {
          body: updatedTemplate?.body,
          subject: updatedTemplate?.subject,
          params: updatedTemplate?.params,
          reply_to: updatedTemplate?.replyTo,
        },
      })
    } else {
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
 * Updates the campaign and email_messages table in a transaction, rolling back when either fails.
 * For campaign table, the s3 meta data is updated with the uploaded file, and its validity is set to true.
 * For email_messages table, existing records are deleted and new ones are bulk inserted.
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
    await CampaignService.replaceCampaignS3Metadata(
      campaignId,
      key,
      filename,
      transaction
    )

    // START populate template
    await EmailTemplateService.addToMessageLogs(
      campaignId,
      records,
      transaction
    )

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
    const emailTemplate = await EmailTemplateService.getFilledTemplate(
      +campaignId
    )
    if (emailTemplate === null) {
      throw new Error('Template does not exist, please create a template')
    }

    // carry out templating / hydration
    // - download from s3
    const { records } = await EmailTemplateService.client.testHydration({
      campaignId: +campaignId,
      s3Key,
      templateSubject: emailTemplate.subject,
      templateBody: emailTemplate.body as string,
      templateParams: emailTemplate.params as string[],
    })

    if (EmailTemplateService.hasInvalidEmailRecipient(records)) {
      throw new InvalidRecipientError()
    }

    // Store temp filename
    await CampaignService.storeS3TempFilename(+campaignId, filename)

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
      CampaignService.storeS3Error(+campaignId, err.message)
    }
  } catch (err) {
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

export const EmailTemplateMiddleware = {
  storeTemplate,
  uploadCompleteHandler,
}
