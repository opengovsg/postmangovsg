import { QueryTypes } from 'sequelize'
import { createCustomLogger } from '@core/utils/logger'
import { StatsService } from '@core/services'
import { CampaignStats, CampaignInvalidRecipient } from '@core/interfaces'

import { TelegramOp, TelegramMessage } from '@telegram/models'

const logger = createCustomLogger(module)

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
 * Gets failed recipients for Telegram project
 * @param campaignId
 */
const getFailedRecipients = async (
  campaignId: number
): Promise<Array<CampaignInvalidRecipient> | undefined> => {
  await refreshStats(+campaignId)
  return StatsService.getFailedRecipients(campaignId, TelegramMessage)
}

export const TelegramStatsService = {
  getStats,
  getFailedRecipients,
  refreshStats,
}
