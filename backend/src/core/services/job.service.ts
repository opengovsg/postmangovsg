import { Campaign } from '@core/models'
import { QueryTypes } from 'sequelize'
import get from 'lodash/get'
const createJob = async ({ campaignId, rate }: {campaignId: number; rate: number}): Promise<number | undefined> => {
  const job = await Campaign.sequelize?.query('SELECT insert_job(:campaignId, :rate);',
    {
      replacements: { campaignId, rate }, type: QueryTypes.SELECT,
    })
  const jobId = get(job, '[0].insert_job')
  return jobId ? Number(jobId) : undefined
}
const stopCampaign = (campaignId: number): Promise<any> | undefined => {
  return Campaign.sequelize?.query('SELECT stop_jobs(:campaignId);',
    {
      replacements: { campaignId }, type: QueryTypes.SELECT,
    })
}
const retryCampaign = (campaignId: number): Promise<any> | undefined  => {
  return Campaign.sequelize?.query('SELECT retry_jobs(:campaignId);',
    {
      replacements: { campaignId }, type: QueryTypes.SELECT,
    })
}
export {
  createJob,
  stopCampaign,
  retryCampaign,
}