import { fn, col, cast } from 'sequelize'
export const getStatsFromTable = async (model: any, campaignId: string): Promise<{error: number; unsent: number; sent: number}> => {
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