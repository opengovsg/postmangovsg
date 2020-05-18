import { fn, col, cast } from 'sequelize'
import { Statistic } from '@core/models'

/**
 * Helper method to get the number of errored messages, sent messages, and messages that remain unsent from ops table. 
 * @param model 
 * @param campaignId 
 */
const getStatsFromTable = async (model: any, campaignId: number): Promise<{ error: number; unsent: number; sent: number }> => {
  const [data] = await model.findAll({
    raw: true,
    /* eslint-disable-next-line @typescript-eslint/camelcase */
    where: { campaign_id: campaignId },
    attributes:
      [
        [fn('count', col('error_code')), 'error'],
        [fn('count', col('message_id')), 'sent'],
        [fn('sum', cast({ 'sent_at': null }, 'int')), 'unsent'],
      ],
  })
  const res = { error: data.error, sent: data.sent, unsent: data.unsent }
  return res
}

/**
 * Helper method to get precomputed number of errored , sent, and unsent from statistic table. 
 * @param model 
 * @param campaignId 
 */
const getStatsFromArchive = async (campaignId: number): Promise<{ error: number; unsent: number; sent: number }> => {
  const stats = await Statistic.findByPk(campaignId)
  if (!stats) {
    throw new Error('No stats found for project')
  }
  return {
    error: stats?.errored,
    sent: stats?.sent,
    unsent: stats?.unsent,
  }
}

const getTotalSentCount = async (): Promise<number> => {
  return Statistic.sum('sent')
}

export const StatsService = {
  getStatsFromTable,
  getStatsFromArchive,
  getTotalSentCount,
}