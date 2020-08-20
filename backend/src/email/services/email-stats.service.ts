import { QueryTypes } from 'sequelize'

import logger from '@core/logger'
import { StatsService } from '@core/services'
import { CampaignStats, CampaignInvalidRecipient } from '@core/interfaces'

import { EmailOp, EmailMessage } from '@email/models'

/**
 * Gets stats for email project
 * @param campaignId
 */
const getStats = (campaignId: number): Promise<CampaignStats> => {
  return StatsService.getCurrentStats(campaignId, EmailOp)
}

/**
 * Forcibly updates stats from email_messages table
 * @param campaignId
 */
const refreshStats = async (campaignId: number): Promise<void> => {
  logger.info(`updateStats invoked for campaign ${campaignId}`)

  await EmailMessage.sequelize?.query(
    'SELECT update_stats_email(:campaign_id)',
    {
      replacements: { campaign_id: campaignId },
      type: QueryTypes.SELECT,
    }
  )
}

/**
 * Gets failed recipients for email project
 * @param campaignId
 */
const getFailedRecipients = async (
  campaignId: number
): Promise<Array<CampaignInvalidRecipient> | undefined> => {
  await refreshStats(+campaignId)
  return StatsService.getFailedRecipients(campaignId, EmailMessage)
}

export const EmailStatsService = {
  getStats,
  getFailedRecipients,
  refreshStats,
}
