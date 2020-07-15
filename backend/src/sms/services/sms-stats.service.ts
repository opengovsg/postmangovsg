import { StatsService } from '@core/services'
import { CampaignStats, CampaignInvalidRecipient } from '@core/interfaces'

import { SmsOp, SmsMessage } from '@sms/models'

/**
 * Gets stats for sms project
 * @param campaignId
 */
const getStats = async (
  campaignId: number,
  refresh: boolean
): Promise<CampaignStats> => {
  return StatsService.getCurrentStats(campaignId, SmsOp, refresh)
}

/**
 * Gets failed recipients for sms project
 * @param campaignId
 */
const getFailedRecipients = async (
  campaignId: number
): Promise<Array<CampaignInvalidRecipient> | undefined> => {
  return StatsService.getFailedRecipients(campaignId, SmsMessage)
}

export const SmsStatsService = {
  getStats,
  getFailedRecipients,
}
