import { Request, Response, NextFunction } from 'express'
import { SmsStatsService } from '@sms/services'
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
    return res.json(stats)
  } catch (err) {
    next(err)
  }
}

/**
 * Gets invalid recipients for sms campaign
 * @param req 
 * @param res 
 * @param next 
 */
const getInvalidRecipients = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  const { campaignId } = req.params
  try {
    const recipients = await SmsStatsService.getInvalidRecipients(+campaignId)
    return res.json(recipients)
  } catch (err) {
    next(err)
  }
}

export const SmsStatsMiddleware = {
  getStats,
  getInvalidRecipients,
}
