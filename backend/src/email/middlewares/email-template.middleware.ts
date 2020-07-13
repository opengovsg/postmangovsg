import { Request, Response, NextFunction } from 'express'
import { HydrationError } from '@core/errors'
import { TemplateError } from 'postman-templating'
import { StatsService } from '@core/services'
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

export const EmailTemplateMiddleware = {
  storeTemplate,
}
