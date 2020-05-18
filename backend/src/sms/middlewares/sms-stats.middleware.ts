import { Request, Response, NextFunction } from 'express'
import { SmsStatsService } from '@sms/services'
/**
 * Gets stats for sms campaign
 * @param req 
 * @param res 
 * @param next 
 */
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