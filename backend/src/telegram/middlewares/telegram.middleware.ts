import { Request, Response, NextFunction } from 'express'

import { TelegramService } from '@telegram/services'

/**
 * Checks if the campaign id supplied is indeed a campaign of the 'TELEGRAM' type, and belongs to the user
 * @param req
 * @param res
 * @param next
 */
const isTelegramCampaignOwnedByUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { campaignId } = req.params
    const userId = req.session?.user?.id
    const campaign = await TelegramService.findCampaign(+campaignId, userId)
    return campaign ? next() : res.sendStatus(400)
  } catch (err) {
    return next(err)
  }
}

/**
 * Gets details of a campaign and the number of recipients that have been uploaded for this campaign
 * @param req
 * @param res
 * @param next
 */
const getCampaignDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { campaignId } = req.params
    const result = await TelegramService.getCampaignDetails(+campaignId)
    return res.json({
      campaign: (await result).campaign,
      num_recipients: result.numRecipients,
    })
  } catch (err) {
    return next(err)
  }
}

export const TelegramMiddleware = {
  isTelegramCampaignOwnedByUser,
  getCampaignDetails,
}
