import { Request, Response, NextFunction } from 'express'
import { StatsService } from '@core/services'

// Return global stats
const getGlobalStats = async (_req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const sent = await StatsService.getTotalSentCount()
    res.json({ sent })
  } catch (e) {
    next(e)
  }
}

export const StatsMiddleware = {
  getGlobalStats,
}