import { QueryTypes } from 'sequelize'

import { loggerWithLabel } from '@core/logger'
import { StatsService } from '@core/services'
import { CampaignStats, CampaignRecipient } from '@core/interfaces'

import { EmailOp, EmailMessage } from '@email/models'

const logger = loggerWithLabel(module)

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
  logger.info({
    message: 'Refresh stats for campaign',
    campaignId,
    action: 'refreshStats',
  })

  await EmailMessage.sequelize?.query(
    'SELECT update_stats_email(:campaign_id)',
    {
      replacements: { campaign_id: campaignId },
      type: QueryTypes.SELECT,
    }
  )
}

/**
 * Gets delivered recipients for email campaign
 * @param campaignId
 */
const getDeliveredRecipients = async (
  campaignId: number
): Promise<Array<CampaignRecipient>> => {
  await refreshStats(+campaignId)
  return StatsService.getDeliveredRecipients(campaignId, EmailMessage)
}

export const EmailStatsService = {
  getStats,
  getDeliveredRecipients,
  refreshStats,
}
