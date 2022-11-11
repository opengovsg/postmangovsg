import { QueryTypes } from 'sequelize'
import { loggerWithLabel } from '@shared/core/logger'
import { StatsService } from '@core/services'
import { CampaignStats } from '@shared/core/interfaces'

import { TelegramOp, TelegramMessage } from '@shared/core/models/telegram'
import { Writable } from 'stream'

const logger = loggerWithLabel(module)

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
  campaignId: number,
  stream: Writable
): Promise<void> => {
  await refreshStats(+campaignId)
  return StatsService.getDeliveredRecipients(
    campaignId,
    TelegramMessage,
    stream
  )
}

export const TelegramStatsService = {
  getStats,
  getDeliveredRecipients,
  refreshStats,
}
