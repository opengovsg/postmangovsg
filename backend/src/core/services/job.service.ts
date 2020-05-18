import { QueryTypes, Op } from 'sequelize'
import get from 'lodash/get'

import config from '@core/config'
import { Campaign } from '@core/models'

const createJob = async ({ campaignId, rate }: {campaignId: number; rate: number}): Promise<number | undefined> => {
  const job = await Campaign.sequelize?.query('SELECT insert_job(:campaignId, :rate);',
    {
      replacements: { campaignId, rate }, type: QueryTypes.SELECT,
    })
  const jobId = get(job, '[0].insert_job')
  return jobId ? Number(jobId) : undefined
}

const canSendCampaign = async (campaignId: number): Promise<boolean> => {
  const campaign = await Campaign.findOne({ where: { id: campaignId, valid: true, credName: { [Op.ne]: null } } })
  return campaign !== null
}

const sendCampaign = ({ campaignId, rate }: {campaignId: number; rate: number}): Promise<(number | undefined)[]> => {
  // Split jobs if the supplied send rate is higher than the rate 1 worker can support
  // The rate is distributed evenly across workers.
  const jobs = []
  const workersNeeded = Math.ceil(rate / config.maxRatePerJob)
  const averageWorkerRate = Math.ceil(rate / workersNeeded)
  const lastWorkerRate = rate - (averageWorkerRate * (workersNeeded - 1))

  for (let workerIndex = 0; workerIndex < workersNeeded; workerIndex++) {
    // Workers index 0 to (workersNeeded - 1) get the average rate
    const sendRate = workerIndex + 1 < workersNeeded
      ? averageWorkerRate
      : lastWorkerRate

    jobs.push(createJob({ campaignId: +campaignId, rate: sendRate }))
  }
    
  return Promise.all(jobs)
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
export const JobService = {
  canSendCampaign,
  sendCampaign,
  stopCampaign,
  retryCampaign,
}