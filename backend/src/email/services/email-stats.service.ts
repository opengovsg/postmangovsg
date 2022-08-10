import { QueryTypes } from 'sequelize'

import { loggerWithLabel } from '@core/logger'
import { StatsService } from '@core/services'
import { CampaignStats } from '@core/interfaces'

import { EmailOp, EmailMessage } from '@email/models'
import { Writable } from 'stream'
import { Unsubscriber } from '@core/models'

const logger = loggerWithLabel(module)

/**
 * Gets stats for email project
 * @param campaignId
 */
const getStats = async (campaignId: number): Promise<CampaignStats> => {
  const [commonStats, unsubCount] = await Promise.all([
    StatsService.getCurrentStats(campaignId, EmailOp),
    Unsubscriber.count({
      where: {
        campaignId,
      },
    }),
  ])
  return {
    ...commonStats,
    unsubscribed: unsubCount,
  }
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
    'SELECT update_stats_email_with_read(:campaign_id)',
    {
      replacements: { campaign_id: campaignId },
      type: QueryTypes.SELECT,
    }
  )
}

/**
 * Gets delivered recipients for email campaign
 * Stream to deal with large campaign size
 * @param campaignId
 */
const getDeliveredRecipients = async (
  campaignId: number,
  stream: Writable
): Promise<void> => {
  await refreshStats(+campaignId)
  return StatsService.getDeliveredRecipients(campaignId, EmailMessage, stream)
}

const getUnsubscribers = async (
  campaignId: number
): Promise<Unsubscriber[]> => {
  return Unsubscriber.findAll({
    where: {
      campaignId,
    },
    useMaster: false,
  })
}

export const EmailStatsService = {
  getStats,
  getDeliveredRecipients,
  refreshStats,
  getUnsubscribers,
}
