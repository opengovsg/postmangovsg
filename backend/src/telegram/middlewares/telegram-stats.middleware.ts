import { Request, Response, NextFunction } from 'express'
import { TelegramStatsService } from '@telegram/services'
import { loggerWithLabel } from '@core/logger'

const logger = loggerWithLabel(module)

/**
 * Gets stats for sms campaign
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
    const stats = await TelegramStatsService.getStats(+campaignId)
    logger.info({
      message: 'Retreived telegram stats',
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
    await TelegramStatsService.refreshStats(+campaignId)
    const stats = await TelegramStatsService.getStats(+campaignId)
    logger.info({
      message: 'Refresh and retreived telegram stats',
      campaignId,
      action: 'updateAndGetStats',
    })
    return res.json(stats)
  } catch (err) {
    next(err)
  }
}

/**
 * Get delivered recipients for Telegram campaign
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
    res.set('Content-Type', 'application/json')
    await TelegramStatsService.getDeliveredRecipients(+campaignId, res)
    logger.info({
      message: 'Retreived failed recipients',
      campaignId,
      action: 'getFailedRecipients',
    })
    return res.end()
  } catch (err) {
    next(err)
  }
}

export const TelegramStatsMiddleware = {
  getStats,
  getDeliveredRecipients,
  updateAndGetStats,
}
