import { StatsService } from '@core/services'
import { CampaignStats } from '@core/interfaces'

import { TelegramOp } from '@telegram/models'

/**
 * Gets stats for telegram project
 * @param campaignId
 */
const getStats = async (campaignId: number): Promise<CampaignStats> => {
  return StatsService.getCurrentStats(campaignId, TelegramOp)
}

export const TelegramStatsService = {
  getStats,
}
