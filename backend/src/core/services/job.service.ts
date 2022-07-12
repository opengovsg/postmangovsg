import { QueryTypes, Op } from 'sequelize'
import get from 'lodash/get'

import config from '@core/config'
import { Campaign } from '@core/models'
import { CampaignService } from './campaign.service'
import { ChannelType } from '@core/constants'

/**
 * Inserts a job into the job_queue table.
 * @see ../worker/src/core/resources/sql/insert-job.sql
 */
const createJob = async ({
  campaignId,
  rate,
}: {
  campaignId: number
  rate: number
}): Promise<number | undefined> => {
  const job = await Campaign.sequelize?.query(
    'SELECT insert_job(:campaignId, :rate);',
    {
      replacements: { campaignId, rate },
      type: QueryTypes.SELECT,
    }
  )
  const jobId = get(job, '[0].insert_job')
  return jobId ? Number(jobId) : undefined
}

/**
 * Checks if a campaign has an associated credential, a template and valid csv uploaded
 * @param campaignId
 */
const canSendCampaign = async (campaignId: number): Promise<boolean> => {
  const campaign = await Campaign.findOne({
    where: {
      id: campaignId,
      valid: true,
      credName: { [Op.ne]: undefined },
      [Op.or]: [{ halted: { [Op.eq]: undefined } }, { halted: false }],
    },
  })
  return campaign !== null
}

/**
 * Calculates the number of jobs needed to support the send rate specified and inserts those jobs
 */
const sendCampaign = async ({
  campaignId,
  rate,
}: {
  campaignId: number
  rate: number
}): Promise<(number | undefined)[] | (number | undefined)> => {
  const campaign = await CampaignService.getCampaignDetails(campaignId, [])
  if (campaign.type === ChannelType.Email) {
    // For email type, we only want to take up a single worker at a time at the
    // preconfigured mailDefaultRate to avoid hogging resources from other campaigns
    return createJob({
      campaignId: +campaignId,
      rate: config.get('mailDefaultRate'),
    })
  }

  // Split jobs if the supplied send rate is higher than the rate 1 worker can support
  // The rate is distributed evenly across workers.
  const jobs = []
  const workersNeeded = Math.ceil(rate / config.get('maxRatePerJob'))
  const averageWorkerRate = Math.ceil(rate / workersNeeded)
  const lastWorkerRate = rate - averageWorkerRate * (workersNeeded - 1)

  for (let workerIndex = 0; workerIndex < workersNeeded; workerIndex++) {
    // Workers index 0 to (workersNeeded - 1) get the average rate
    const sendRate =
      workerIndex + 1 < workersNeeded ? averageWorkerRate : lastWorkerRate

    jobs.push(createJob({ campaignId: +campaignId, rate: sendRate }))
  }

  return Promise.all(jobs)
}

/**
 * @see ../worker/src/core/resources/sql/stop-jobs.sql
 * @param campaignId
 */
const stopCampaign = (campaignId: number): Promise<any> | undefined => {
  return Campaign.sequelize?.query('SELECT stop_jobs(:campaignId);', {
    replacements: { campaignId },
    type: QueryTypes.SELECT,
  })
}

/**
 * @see ../worker/src/core/resources/sql/retry-jobs.sql
 * @param campaignId
 */
const retryCampaign = (campaignId: number): Promise<any> | undefined => {
  return Campaign.sequelize?.query('SELECT retry_jobs(:campaignId);', {
    replacements: { campaignId },
    type: QueryTypes.SELECT,
  })
}

export const JobService = {
  canSendCampaign,
  sendCampaign,
  stopCampaign,
  retryCampaign,
}
