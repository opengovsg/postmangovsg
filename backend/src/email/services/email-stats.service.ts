
import { StatsService } from '@core/services'
import { CampaignStats } from '@core/interfaces'

import { EmailOp } from '@email/models'

/**
 * Gets stats for email project
 * @param campaignId 
 */
const getStats = async (campaignId: number): Promise<CampaignStats> => {
  return StatsService.getCurrentStats(campaignId, EmailOp)
} 

export const EmailStatsService = {
  getStats,
}