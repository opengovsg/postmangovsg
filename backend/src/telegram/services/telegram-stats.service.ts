import { StatsService } from '@core/services'
import { CampaignStats, CampaignInvalidRecipient } from '@core/interfaces'

import { TelegramOp, TelegramMessage } from '@telegram/models'

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
  return StatsService.updateStats(campaignId)
}

/**
 * Gets failed recipients for Telegram project
 * @param campaignId
 */
const getFailedRecipients = async (
  campaignId: number
): Promise<Array<CampaignInvalidRecipient> | undefined> => {
  return StatsService.getFailedRecipients(campaignId, TelegramMessage)
}

export const TelegramStatsService = {
  getStats,
  getFailedRecipients,
  refreshStats,
}
