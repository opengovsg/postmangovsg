import { Request, Response, NextFunction } from 'express'
import { UniqueConstraintError } from 'sequelize'

import { CampaignService, UnsubscriberService } from '@core/services'

/**
 * Validate and check if params for unsubscribe request are valid
 * @param req
 * @param res
 * @param next
 */
const isUnsubscribeRequestValid = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const params = req.query.c ? req.query : req.body
    const { c: campaignId, r: recipient, v: version, h: hash } = params

    UnsubscriberService.validateHash({ campaignId, recipient, version, hash })

    const campaign = await CampaignService.getCampaignDetails(campaignId, [])
    if (!campaign) {
      throw new Error('Invalid campaign')
    }

    res.locals.unsubscribe = {
      campaign,
      recipient,
    }

    next()
  } catch (err) {
    return res.status(400).json({
      message: 'Invalid unsubscribe request',
    })
  }
}

/**
 * Retrieves the unsubscribe status and the associated campaign
 * @param _req
 * @param res
 */
const getUnsubscriberStatus = async (
  _req: Request,
  res: Response
): Promise<Response> => {
  const { campaign, recipient } = res.locals.unsubscribe
  const unsubscribe = await UnsubscriberService.getUnsubscriber(
    campaign.id,
    recipient
  )

  return res.json({
    unsubscribed: unsubscribe !== null,
    campaign: {
      name: campaign.name,
      channelType: campaign.type,
    },
  })
}

/**
 * Creates a new unsubscribe record
 * @param _req
 * @param res
 * @param next
 */
const createUnsubscriber = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { campaign, recipient } = res.locals.unsubscribe
    await UnsubscriberService.createUnsubscriber({
      campaignId: campaign.id,
      recipient,
    })
    return res.status(201).json({
      unsubscribed: true,
      campaign: {
        name: campaign.name,
        channelType: campaign.type,
      },
    })
  } catch (err) {
    if (err instanceof UniqueConstraintError) {
      return res.status(400).json({
        message: 'Campaign is already unsubscribed',
      })
    }

    next(err)
  }
}

export const UnsubscriberMiddleware = {
  isUnsubscribeRequestValid,
  getUnsubscriberStatus,
  createUnsubscriber,
}
