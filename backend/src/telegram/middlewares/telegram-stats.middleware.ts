import { Request, Response, NextFunction } from 'express'
import { TelegramStatsService } from '@telegram/services'
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
    const recipients = await TelegramStatsService.getDeliveredRecipients(
      +campaignId
    )
    return res.json(recipients)
  } catch (err) {
    next(err)
  }
}

export const TelegramStatsMiddleware = {
  getStats,
  getDeliveredRecipients,
  updateAndGetStats,
}
