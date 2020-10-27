import { QueryTypes } from 'sequelize'

import logger from '@core/logger'
import { StatsService } from '@core/services'
import { CampaignStats, CampaignRecipient } from '@core/interfaces'

import { SmsOp, SmsMessage } from '@sms/models'

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
  logger.info(`updateStats invoked for campaign ${campaignId}`)

  await SmsMessage.sequelize?.query('SELECT update_stats_sms(:campaign_id)', {
    replacements: { campaign_id: campaignId },
    type: QueryTypes.SELECT,
  })
}

/**
 * Gets delivered recipients for sms campaign
 * @param campaignId
 */
const getDeliveredRecipients = async (
  campaignId: number
): Promise<Array<CampaignRecipient>> => {
  await refreshStats(+campaignId)
  return StatsService.getDeliveredRecipients(campaignId, SmsMessage)
}

export const SmsStatsService = {
  getStats,
  getDeliveredRecipients,
  refreshStats,
}
