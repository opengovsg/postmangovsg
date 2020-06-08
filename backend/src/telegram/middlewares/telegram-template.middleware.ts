import { Request, Response, NextFunction } from 'express'
import { HydrationError, TemplateError } from '@core/errors'

import { TelegramTemplateService } from '@telegram/services'

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
  try {
    const { campaignId } = req.params
    const { body } = req.body

    const {
      check,
      numRecipients,
      valid,
      updatedTemplate,
    } = await TelegramTemplateService.storeTemplate({
      campaignId: +campaignId,
      body,
    })

    if (check?.reupload) {
      return res.status(200).json({
        message:
          'Please re-upload your recipient list as template has changed.',
        extra_keys: check.extraKeys,
        num_recipients: numRecipients,
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
        num_recipients: numRecipients,
        template: {
          body: updatedTemplate?.body,
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

export const TelegramTemplateMiddleware = {
  storeTemplate,
}
