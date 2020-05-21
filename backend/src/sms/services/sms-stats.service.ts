
import { StatsService } from '@core/services'
import { CampaignStats } from '@core/interfaces'

import { SmsOp } from '@sms/models'

/**
 * Gets stats for sms project
 * @param campaignId 
 */
const getStats = async (campaignId: number): Promise<CampaignStats> => {
  return StatsService.getCurrentStats(campaignId, SmsOp)
} 

export const SmsStatsService = {
  getStats,
}