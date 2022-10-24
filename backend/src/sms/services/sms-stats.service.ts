import { CampaignStats } from '@core/interfaces'
import { loggerWithLabel } from '@core/logger'
import { StatsService } from '@core/services'
import { SmsMessage, SmsOp } from '@sms/models'
import { QueryTypes } from 'sequelize'
import { Writable } from 'stream'

const logger = loggerWithLabel(module)

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
 * Gets delivered recipients for sms campaign
 * Stream to deal with large campaign size
 * @param campaignId
 */
const getDeliveredRecipients = async (
  campaignId: number,
  stream: Writable
): Promise<void> => {
  await refreshStats(+campaignId)
  return StatsService.getDeliveredRecipients(campaignId, SmsMessage, stream)
}

export const SmsStatsService = {
  getStats,
  getDeliveredRecipients,
  refreshStats,
}
