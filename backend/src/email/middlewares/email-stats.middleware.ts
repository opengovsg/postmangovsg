import { Request, Response, NextFunction } from 'express'
import { EmailStatsService } from '@email/services'
import { loggerWithLabel } from '@core/logger'

const logger = loggerWithLabel(module)

/**
 * Gets stats for email campaign
 * @param req
 * @param res
 * @param next
 */
const getStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  const { campaignId } = req.params
  try {
    const stats = await EmailStatsService.getStats(+campaignId)
    logger.info({
      message: 'Retreived email stats',
      campaignId,
      action: 'getStats',
    })
    return res.json(stats)
  } catch (err) {
    next(err)
  }
}

/**
 * Forcibly refresh stats for campaign, then retrieves them
 * @param req
 * @param res
 * @param next
 */
const updateAndGetStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  const { campaignId } = req.params
  try {
    await EmailStatsService.refreshStats(+campaignId)
    const stats = await EmailStatsService.getStats(+campaignId)
    logger.info({
      message: 'Refresh and retreived email stats',
      campaignId,
      action: 'updateAndGetStats',
    })
    return res.json(stats)
  } catch (err) {
    next(err)
  }
}

/**
 * Get delivered recipients for email campaign
 * @param req
 * @param res
 * @param next
 */
const getDeliveredRecipients = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  const { campaignId } = req.params
  try {
    const recipients = await EmailStatsService.getDeliveredRecipients(
      +campaignId
    )
    logger.info({
      message: 'Retreived delivered recipients',
      campaignId,
      action: 'getDeliveredRecipients',
    })
    return res.json(recipients)
  } catch (err) {
    next(err)
  }
}

export const EmailStatsMiddleware = {
  getStats,
  getDeliveredRecipients,
  updateAndGetStats,
}
