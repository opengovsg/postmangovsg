import { Request, Response, NextFunction } from 'express'
import config from '@core/config'
import logger from '@core/logger'
import {
  HydrationError,
  TemplateError,
  InvalidRecipientError,
} from '@core/errors'
import {
  CampaignService,
  TemplateService,
} from '@core/services'
import { EmailTemplateService } from '@email/services'
import { StoreTemplateOutput } from '@email/interfaces'

/**
 * Store template subject and body in email template table.
 * If an existing csv has been uploaded for this campaign but whose columns do not match the attributes provided in the new template,
 * delete the old csv, and prompt user to upload a new csv.
 * @param req
 * @param res
 * @param next
 */
const storeTemplate = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const { campaignId } = req.params
    const { subject, body, reply_to: replyTo } = req.body
    const { check, numRecipients, valid, updatedTemplate }: StoreTemplateOutput =
        await EmailTemplateService.storeTemplate({ campaignId: +campaignId, subject, body, replyTo })
    if (check?.reupload) {
      return res.status(200)
        .json({
          message: 'Please re-upload your recipient list as template has changed.',
          'extra_keys': check.extraKeys,
          'num_recipients': numRecipients,
          valid: false,
          template: {
            body: updatedTemplate?.body,
            subject: updatedTemplate?.subject,
            params: updatedTemplate?.params,
            // eslint-disable-next-line @typescript-eslint/camelcase
            reply_to: updatedTemplate?.replyTo,
          },
        })
    } else {
      return res.status(200)
        .json({
          message: `Template for campaign ${campaignId} updated`,
          valid: valid,
          'num_recipients': numRecipients,
          template: {
            body: updatedTemplate?.body,
            subject: updatedTemplate?.subject,
            params: updatedTemplate?.params,
            // eslint-disable-next-line @typescript-eslint/camelcase
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
const uploadCompleteHandler = async (req: Request, res: Response): Promise<Response | void> => {

  res.setTimeout(config.get('express.uploadCompleteTimeout'),  () => {
    if (!res.headersSent) {
      return res.sendStatus(408)
    }
    return
  })

  try {
    const { campaignId } = req.params

    // switch campaign to invalid - this is for the case of uploading over an existing file
    await CampaignService.setInvalid(+campaignId)

    // extract s3Key from transactionId
    const { 'transaction_id': transactionId, filename } = req.body
    const s3Key = TemplateService.extractS3Key(transactionId)


    // check if template exists
    const emailTemplate = await EmailTemplateService.getFilledTemplate(+campaignId)
    if (emailTemplate === null){
      throw new Error('Template does not exist, please create a template')
    }

    // Updates metadata in project
    await CampaignService.updateCampaignS3Metadata({ key: s3Key, campaignId, filename })

    // carry out templating / hydration
    // - download from s3

    const { records, hydratedRecord } = await EmailTemplateService.client.testHydration({
      campaignId: +campaignId,
      s3Key,
      templateSubject: emailTemplate.subject,
      templateBody: emailTemplate.body as string,
      templateParams: emailTemplate.params as string[],
    })

    if (EmailTemplateService.hasInvalidEmailRecipient(records)) throw new InvalidRecipientError()

    const recipientCount: number = records.length

    // START populate template
    logger.info(`before email.addToMessageLogs; campaignId=${campaignId}`)
    await EmailTemplateService.addToMessageLogs(+campaignId, records)
    logger.info(`after email.addToMessageLogs; campaignId=${campaignId}`)

    if (!res.headersSent){
      return res.json({
        'num_recipients': recipientCount,
        preview: {
          ...hydratedRecord,
          // eslint-disable-next-line @typescript-eslint/camelcase
          reply_to: emailTemplate.replyTo || null,
        },
      })
    }

  } catch (err) {
    if (!res.headersSent){
      return res.status(400).json({ message: err.message })
    }
  }

}

export const EmailTemplateMiddleware = {
  storeTemplate,
  uploadCompleteHandler,
}