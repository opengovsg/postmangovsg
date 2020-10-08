import { QueryTypes } from 'sequelize'

import { createCustomLogger } from '@core/utils/logger'
import { StatsService } from '@core/services'
import { CampaignStats, CampaignInvalidRecipient } from '@core/interfaces'

import { SmsOp, SmsMessage } from '@sms/models'

const logger = createCustomLogger(module)

/**
 * Gets stats for sms project
 * @param campaignId
 */
const getStats = async (campaignId: number): Promise<CampaignStats> => {
  return StatsService.getCurrentStats(campaignId, SmsOp)
}

/**
 * Forcibly updates stats from sms_messages table
 * @param campaignId
 */
const refreshStats = async (campaignId: number): Promise<void> => {
  logger.info({
    message: 'Refresh stats for campaign',
    campaignId,
    action: 'refreshStats',
  })

  await SmsMessage.sequelize?.query('SELECT update_stats_sms(:campaign_id)', {
    replacements: { campaign_id: campaignId },
    type: QueryTypes.SELECT,
  })
}

/**
 * Gets failed recipients for sms project
 * @param campaignId
 */
const getFailedRecipients = async (
  campaignId: number
): Promise<Array<CampaignInvalidRecipient> | undefined> => {
  await refreshStats(+campaignId)
  return StatsService.getFailedRecipients(campaignId, SmsMessage)
}

export const SmsStatsService = {
  getStats,
  getFailedRecipients,
  refreshStats,
}
