
import { JobQueue } from '@core/models'
import { StatsService } from '@core/services'
import { CampaignStats } from '@core/interfaces'

import { EmailOp } from '@email/models'

/**
 * Gets stats from the ops table if job is still being worked on by a sender, otherwise, get the stats from the message logs table
 * @param campaignId 
 */
const getStats = async (campaignId: number): Promise<CampaignStats> => {
  const job = await JobQueue.findOne({ where: { campaignId } })
  if (job === null) throw new Error('Unable to find campaign in job queue table.')
  
  // Gets from email ops table if status is SENDING or SENT
  if (job.status === 'SENDING' || job.status === 'SENT') {
    const stats = await StatsService.getStatsFromTable(EmailOp, campaignId) 
    return { error: stats.error, unsent: stats.unsent, sent: stats.sent, status: job.status }
  }
  
  const stats = await StatsService.getStatsFromArchive(campaignId) 
  return { error: stats.error, unsent: stats.unsent, sent: stats.sent, status: job.status }
} 
  

export const EmailStatsService = {
  getStats,
}