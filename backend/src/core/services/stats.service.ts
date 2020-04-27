export const getStatsFromTable = async (model: any, campaignId: string): Promise<{error: number, unsent: number, sent: number}> => {
  const error = await model.count({
    where: {campaign_id: campaignId},
    col: 'error_code'
  })
  const total = await model.count({
    where: {campaign_id: campaignId},
    col: 'id'
  })
  const sent = await model.count({
    where: {campaign_id: campaignId},
    col: 'message_id'
  })

  const unsent = total - sent
  return { error, sent, unsent }
}