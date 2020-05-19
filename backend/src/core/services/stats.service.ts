import { fn, col, cast } from 'sequelize'
/**
 * Helper method to get the number of errored messages, sent messages, and messages that remain unsent. 
 * @param model 
 * @param campaignId 
 */
const getStatsFromTable = async (model: any, campaignId: number): Promise<{error: number; unsent: number; sent: number}> => {
  const [data]= await model.findAll({
    raw : true, 
    /* eslint-disable-next-line @typescript-eslint/camelcase */
    where:  { campaign_id: campaignId },
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

export const StatsService = {
  getStatsFromTable,
}