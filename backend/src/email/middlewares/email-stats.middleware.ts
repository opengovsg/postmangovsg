import { Request, Response, NextFunction } from 'express'
import { EmailStatsService } from '@email/services'

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
    res.set('Content-Type', 'application/json')
    await EmailStatsService.getDeliveredRecipients(+campaignId, res)
    return res.end()
  } catch (err) {
    next(err)
  }
}

export const EmailStatsMiddleware = {
  getStats,
  getDeliveredRecipients,
  updateAndGetStats,
}
