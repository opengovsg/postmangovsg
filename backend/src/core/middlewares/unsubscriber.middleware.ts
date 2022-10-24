import { loggerWithLabel } from '@core/logger'
import { CampaignService, UnsubscriberService } from '@core/services'
import { NextFunction, Request, Response } from 'express'

const logger = loggerWithLabel(module)

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
  const { campaignId, recipient } = req.params
  const { v: version, h: hash } = req.body
  const logMeta = {
    campaignId,
    recipient,
    action: 'isUnsubscribeRequestValid',
  }

  try {
    UnsubscriberService.validateHash({
      campaignId: +campaignId,
      recipient,
      version,
      hash,
    })

    const campaign = await CampaignService.getCampaignDetails(+campaignId, [])
    if (!campaign) {
      throw new Error('Invalid campaign')
    }

    res.locals.unsubscriber = {
      campaignId: +campaignId,
      recipient,
    }

    next()
  } catch (err) {
    console.error(err)
    logger.error({ message: 'Invalid unsubscribe request', ...logMeta })
    return res.status(400).json({
      message: 'Invalid unsubscribe request',
    })
  }
}

/**
 * Creates a new unsubscribe record
 * @param _req
 * @param res
 * @param next
 */
const findOrCreateUnsubscriber = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  const { campaignId, recipient } = res.locals.unsubscriber
  const { 1: created } = await UnsubscriberService.findOrCreateUnsubscriber({
    campaignId,
    recipient,
    reason: req.body.reason,
  })

  const statusCode = created ? 201 : 200
  return res.sendStatus(statusCode)
}

const subscribeAgain = async (
  _req: Request,
  res: Response
): Promise<Response | void> => {
  const { campaignId, recipient } = res.locals.unsubscriber
  await UnsubscriberService.deleteUnsubscriber({ campaignId, recipient })
  return res.sendStatus(204)
}

export const UnsubscriberMiddleware = {
  isUnsubscribeRequestValid,
  findOrCreateUnsubscriber,
  subscribeAgain,
}
