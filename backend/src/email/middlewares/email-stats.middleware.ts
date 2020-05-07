import { Request, Response, NextFunction } from 'express'
import { EmailStatsService } from '@email/services'
// Get the stats of a campaign
const getStats = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  const { campaignId } = req.params
  try {
    const stats = await EmailStatsService.getStats(+campaignId)
    return res.json(stats)
  } catch (err) {
    next(err)
  }
}

export const EmailStatsMiddleware = {
  getStats,
}