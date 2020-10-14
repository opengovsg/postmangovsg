import { Request, Response, NextFunction } from 'express'
import { SmsStatsService } from '@sms/services'
import Logger from '@core/logger'

const logger = Logger.loggerWithLabel(module)

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
    const stats = await SmsStatsService.getStats(+campaignId)
    logger.info({
      message: 'Retreived sms stats',
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
    await SmsStatsService.refreshStats(+campaignId)
    const stats = await SmsStatsService.getStats(+campaignId)
    logger.info({
      message: 'Refresh and retreived sms stats',
      campaignId,
      action: 'updateAndGetStats',
    })
    return res.json(stats)
  } catch (err) {
    next(err)
  }
}

/**
 * Get delivered recipients for sms campaign
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
    const recipients = await SmsStatsService.getDeliveredRecipients(+campaignId)
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

export const SmsStatsMiddleware = {
  getStats,
  getDeliveredRecipients,
  updateAndGetStats,
}
