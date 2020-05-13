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
} from '@core/services'
import { EmailTemplateService } from '@email/services'
import { StoreTemplateOutput } from '@email/interfaces'
  

// Store body of message in email template table
// Store body of message in sms template table
const storeTemplate = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const { campaignId } = req.params
    const { subject, body } = req.body
    const { check, numRecipients, valid, updatedTemplate }: StoreTemplateOutput = 
        await EmailTemplateService.storeTemplate({ campaignId: +campaignId, subject, body })
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
  
// Read file from s3 and populate messages table
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
    if(emailTemplate === null){
      return res.status(400).json({
        message: 'Template does not exist, please create a template',
      })
    }
    
    // Updates metadata in project
    await CampaignService.updateCampaignS3Metadata({ key: s3Key, campaignId, filename })
  
    // carry out templating / hydration
    // - download from s3
    try {
      const { records, hydratedRecord } = await EmailTemplateService.client.testHydration({
        campaignId: +campaignId,
        s3Key,
        templateSubject: emailTemplate.subject,
        templateBody: emailTemplate.body as string,
        templateParams: emailTemplate.params as string[],
      })
        
      const recipientCount: number = records.length
       
      // START populate template
      await EmailTemplateService.addToMessageLogs(+campaignId, records)
  
      return res.json({
        'num_recipients': recipientCount,
        preview: hydratedRecord,
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