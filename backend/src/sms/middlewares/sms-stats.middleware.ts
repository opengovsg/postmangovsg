import { Request, Response, NextFunction } from 'express'
import { SmsStatsService } from '@sms/services'
// Get the stats of a campaign
const getStats = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  const { campaignId } = req.params
  try {
    const stats = await SmsStatsService.getStats(+campaignId)
    return res.json(stats)
  } catch (err) {
    next(err)
  }
}

export const SmsStatsMiddleware = {
  getStats,
}