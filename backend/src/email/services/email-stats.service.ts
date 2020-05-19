
import { StatsService } from '@core/services'
import { CampaignStats } from '@core/interfaces'

import { EmailOp } from '@email/models'

/**
 * Gets stats from the ops table if job is still being worked on by a sender, otherwise, get the stats from the message logs table
 * @param campaignId 
 */
const getStats = async (campaignId: number): Promise<CampaignStats> => {
  return StatsService.getCurrentStats(campaignId, EmailOp)
} 

export const EmailStatsService = {
  getStats,
}