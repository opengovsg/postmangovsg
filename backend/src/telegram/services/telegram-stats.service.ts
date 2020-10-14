import { QueryTypes } from 'sequelize'
import Logger from '@core/logger'
import { StatsService } from '@core/services'
import { CampaignStats, CampaignRecipient } from '@core/interfaces'

import { TelegramOp, TelegramMessage } from '@telegram/models'

const logger = Logger.loggerWithLabel(module)

/**
 * Gets stats for telegram project
 * @param campaignId
 */
const getStats = async (campaignId: number): Promise<CampaignStats> => {
  return StatsService.getCurrentStats(campaignId, TelegramOp)
}

/**
 * Forcibly updates stats from telegram_messages table
 * @param campaignId
 */
const refreshStats = async (campaignId: number): Promise<void> => {
  logger.info({
    message: 'Refresh stats for campaign',
    campaignId,
    action: 'refreshStats',
  })

  await TelegramMessage.sequelize?.query(
    'SELECT update_stats_telegram(:campaign_id)',
    {
      replacements: { campaign_id: campaignId },
      type: QueryTypes.SELECT,
    }
  )
}

/**
 * Gets delivered recipients for Telegram campaign
 * @param campaignId
 */
const getDeliveredRecipients = async (
  campaignId: number
): Promise<Array<CampaignRecipient>> => {
  await refreshStats(+campaignId)
  return StatsService.getDeliveredRecipients(campaignId, TelegramMessage)
}

export const TelegramStatsService = {
  getStats,
  getDeliveredRecipients,
  refreshStats,
}
