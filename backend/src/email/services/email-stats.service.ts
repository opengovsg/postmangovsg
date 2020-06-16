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
 * Gets failed recipients for email project
 * @param campaignId
 */
const getFailedRecipients = async (
  campaignId: number
): Promise<Array<CampaignInvalidRecipient> | undefined> => {
  return StatsService.getFailedRecipients(campaignId, EmailMessage)
}

export const EmailStatsService = {
  getStats,
  getFailedRecipients,
}
