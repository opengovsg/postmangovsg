import { StatsService } from '@core/services'
import { CampaignStats, CampaignInvalidRecipient } from '@core/interfaces'

import { SmsOp, SmsMessage } from '@sms/models'

/**
 * Gets stats for sms project
 * @param campaignId
 */
const getStats = async (campaignId: number): Promise<CampaignStats> => {
  return StatsService.getCurrentStats(campaignId, SmsOp)
}

/**
 * Gets invalid recipients for sms project
 * @param campaignId 
 */
const getInvalidRecipients = async (campaignId: number): Promise<Array<CampaignInvalidRecipient> | undefined> => {
  return StatsService.getInvalidRecipients(campaignId, SmsMessage.tableName)
}

export const SmsStatsService = {
  getStats,
  getInvalidRecipients,
}
