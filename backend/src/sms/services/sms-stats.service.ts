
import { JobQueue } from '@core/models'
import { SmsMessage, SmsOp } from '@sms/models'
import { CampaignStats } from '@core/interfaces'
import { StatsService } from '@core/services'

const getStats = async (campaignId: number): Promise<CampaignStats> => {
  const job = await JobQueue.findOne({ where: { campaignId } })
  if (job === null) throw new Error('Unable to find campaign in job queue table.')
  
  // Gets from email ops table if status is SENDING or SENT
  if (job.status === 'SENDING' || job.status === 'SENT') {
    const stats = await StatsService.getStatsFromTable(SmsOp, campaignId) 
    return { error: stats.error, unsent: stats.unsent, sent: stats.sent, status: job.status }
  }
  
  const stats = await StatsService.getStatsFromTable(SmsMessage, campaignId) 
  return { error: stats.error, unsent: stats.unsent, sent: stats.sent, status: job.status }
} 
  

export const SmsStatsService = {
  getStats,
}