import { Request, Response, NextFunction } from 'express'
import logger from '@core/logger'
import {
  MissingTemplateKeysError,
  HydrationError,
  RecipientColumnMissing,
  TemplateError,
  InvalidRecipientError,
} from '@core/errors'
import {
  CampaignService,
  TemplateService,
  AuthService,
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
const uploadCompleteHandler = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const { campaignId } = req.params

    // switch campaign to invalid - this is for the case of uploading over an existing file
    await CampaignService.setInvalid(+campaignId)
  
    // extract s3Key from transactionId
    const { 'transaction_id': transactionId, filename } = req.body
    let s3Key: string
    try {
      s3Key = TemplateService.extractS3Key(transactionId)
    } catch (err) {
      return res.status(400).json(err.message)
    }
  
    // check if template exists
    const emailTemplate = await EmailTemplateService.getFilledTemplate(+campaignId)
    if (emailTemplate === null){
      return res.status(400).json({
        message: 'Template does not exist, please create a template',
      })
    }
    
    // Updates metadata in project
    await CampaignService.updateCampaignS3Metadata({ key: s3Key, campaignId, filename })
  
    // carry out templating / hydration
    // - download from s3
    try {
      // eslint-disable-next-line prefer-const
      let { records, hydratedRecord } = await EmailTemplateService.client.testHydration({
        campaignId: +campaignId,
        s3Key,
        templateSubject: emailTemplate.subject,
        templateBody: emailTemplate.body as string,
        templateParams: emailTemplate.params as string[],
      })
      
      // VAPT:
      const user = await AuthService.findUser(req?.session?.user?.id)
      const SANDBOX_EMAIL = 'success@simulator.amazonses.com'
      const MAX_RECORDS = 20
      const numberOfRecords = Math.min(records.length, MAX_RECORDS)
      if (numberOfRecords < records.length) logger.info(`[${campaignId}] VAPT: TRUNCATED NUMBER OF RECORDS FROM ${records.length} TO ${numberOfRecords}`)
      records = records.slice(0, numberOfRecords)
      logger.info(`[${campaignId}] VAPT: REPLACING 1/${records.length} RECORD WITH USER'S EMAIL: ${user.email}`)
      records[0].recipient = user.email
      logger.info(`[${campaignId}] VAPT: REPLACING ${records.length-1}/${records.length} RECORD WITH SANDBOX EMAIL: ${SANDBOX_EMAIL}`)
      for (let i = 1; i < records.length; i++) records[i].recipient = SANDBOX_EMAIL
      const recipientCount: number = records.length
       
      // START populate template
      await EmailTemplateService.addToMessageLogs(+campaignId, records)
  
      return res.json({
        'num_recipients': recipientCount,
        preview: {
          ...hydratedRecord,
          // eslint-disable-next-line @typescript-eslint/camelcase
          reply_to: emailTemplate.replyTo || null,
        },
      })
  
    } catch (err) {
      logger.error(`Error parsing file for campaign ${campaignId}. ${err.stack}`)
      throw err
    }
  } catch (err) {
    if (err instanceof RecipientColumnMissing || err instanceof MissingTemplateKeysError || err instanceof InvalidRecipientError){
      return res.status(400).json({ message: err.message })
    }
    return next(err)
  }
}
  
export const EmailTemplateMiddleware = {
  storeTemplate,
  uploadCompleteHandler,
}