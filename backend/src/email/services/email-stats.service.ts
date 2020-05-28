import { StatsService } from '@core/services'
import { CampaignStats, CampaignInvalidRecipient } from '@core/interfaces'

import { EmailOp, EmailMessage } from '@email/models'

/**
 * Gets stats for email project
 * @param campaignId
 */
const getStats = async (campaignId: number): Promise<CampaignStats> => {
  return StatsService.getCurrentStats(campaignId, EmailOp)
}

/**
 * Gets invalid recipients for email project
 * @param campaignId 
 */
const getInvalidRecipients = async (campaignId: number): Promise<Array<CampaignInvalidRecipient>> => {
  return StatsService.getInvalidRecipients(campaignId, EmailMessage)
}

export const EmailStatsService = {
  getStats,
  getInvalidRecipients
}
