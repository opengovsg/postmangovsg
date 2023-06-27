import { CampaignStats } from '@core/interfaces'
import { StatsService } from '@core/services'
import { GovsgMessage } from '@govsg/models/govsg-message'
import { GovsgOp } from '@govsg/models/govsg-op'
import { QueryTypes } from 'sequelize'

import { Writable } from 'stream'

export async function getStats(campaignId: number): Promise<CampaignStats> {
  return StatsService.getCurrentStats(campaignId, GovsgOp)
}

export async function refreshStats(campaignId: number): Promise<void> {
  await GovsgMessage.sequelize?.query(
    'SELECT update_stats_govsg(:campaignId);',
    {
      replacements: { campaignId },
      type: QueryTypes.SELECT,
    }
  )
}

export async function getDeliveredRecipients(
  campaignId: number,
  stream: Writable
): Promise<void> {
  await refreshStats(campaignId)
  return StatsService.getDeliveredRecipients(campaignId, GovsgMessage, stream)
}
