import { Op, QueryTypes } from 'sequelize'
import get from 'lodash/get'

import config from '@core/config'
import { Campaign, JobQueue } from '@core/models'
import { CampaignService } from './campaign.service'
import { ChannelType, JobStatus } from '@core/constants'
import { ListService } from '.'

/**
 * Inserts a job into the job_queue table.
 * @see ../backend/src/database/migrations/20210429044423-create-insert-job-function.js
 */
const createJob = async ({
  campaignId,
  rate,
  scheduledTiming = undefined,
}: {
  campaignId: number
  rate: number
  scheduledTiming?: Date
}): Promise<number | undefined> => {
  if (!scheduledTiming) {
    // if its not a scheduled campaign, just throw in current timing. will not affect main flow of logic
    scheduledTiming = new Date()
  }

  //format scheduled Timing to a formatted string
  const stringTiming =
    scheduledTiming.getUTCMonth() +
    1 +
    '/' +
    scheduledTiming.getUTCDate() +
    '/' +
    scheduledTiming.getUTCFullYear() +
    ' ' +
    scheduledTiming.getUTCHours() +
    ':' +
    scheduledTiming.getUTCMinutes() +
    ':' +
    scheduledTiming.getUTCSeconds()
  const job = await Campaign.sequelize?.query(
    'SELECT insert_job(:campaignId, :rate, :scheduledTiming);',
    {
      replacements: {
        campaignId,
        rate,
        scheduledTiming: stringTiming,
      },
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
      credName: { [Op.ne]: null },
      [Op.or]: [{ halted: { [Op.eq]: null } }, { halted: false }],
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
  userId,
  scheduledTiming = undefined,
}: {
  campaignId: number
  rate: number
  userId: number
  // scheduled timing is intended to be a pass through variable. just pass and don't handle
  // let the createJob handle it.
  scheduledTiming?: Date
}): Promise<(number | undefined)[] | (number | undefined)> => {
  const campaign = await CampaignService.getCampaignDetails(campaignId, [])

  // If campaign was set to `should_save_list`, create a new managed list in the database.
  // Add the campaign sender as an owner of the list.
  if (campaign.should_save_list) {
    const list = await ListService.createList({
      s3key: campaign.s3_object?.key || '',
      etag: campaign.s3_object?.etag || '',
      filename: campaign.s3_object?.filename || '',
      channel: campaign.type as ChannelType,
    })
    await ListService.grantListAccessToUser({
      userId,
      listId: list.id,
    })
  }

  // save visible at into campaign as well
  // if undefined passed then so be it, campaign allows nullable visible_at
  await Campaign.update(
    {
      visibleAt: scheduledTiming,
    },
    {
      where: { id: campaignId },
      returning: false,
    }
  )

  if (campaign.type === ChannelType.Email) {
    // For email type, we only want to take up a single worker at a time at the
    // preconfigured mailDefaultRate to avoid hogging resources from other campaigns
    return createJob({
      campaignId: +campaignId,
      rate: config.get('mailDefaultRate'),
      scheduledTiming,
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

    jobs.push(
      createJob({ campaignId: +campaignId, rate: sendRate, scheduledTiming })
    )
  }

  return Promise.all(jobs)
}

/**
 * @see ../backend/src/database/migrations/20210501121338-create-stop-jobs-function.js
 * @param campaignId
 */
const stopCampaign = (campaignId: number): Promise<any> | undefined => {
  return Campaign.sequelize?.query('SELECT stop_jobs(:campaignId);', {
    replacements: { campaignId },
    type: QueryTypes.SELECT,
  })
}

/**
 * @see ../backend/src/database/migrations/20210501120857-create-retry-jobs-function.js
 * @param campaignId
 */
const retryCampaign = (campaignId: number): Promise<any> | undefined => {
  return Campaign.sequelize?.query('SELECT retry_jobs(:campaignId);', {
    replacements: { campaignId },
    type: QueryTypes.SELECT,
  })
}

const updateScheduledCampaign = async (
  campaignId: number,
  scheduledTiming: Date
): Promise<number> => {
  const jobCount = await JobQueue.count({
    where: { campaignId, status: { [Op.eq]: JobStatus.Ready } },
  })
  if (jobCount > 0) {
    await JobQueue.update(
      {
        visibleAt: scheduledTiming,
      },
      {
        where: { campaignId },
        returning: true,
      }
    )
  }
  return jobCount
}
// indiscriminately delete JobQueue records that have the campaignId
const cancelScheduledCampaign = async (campaignId: number) => {
  await JobQueue.destroy({ where: { campaignId } })
}

export const JobService = {
  canSendCampaign,
  sendCampaign,
  stopCampaign,
  retryCampaign,
  updateScheduledCampaign,
  cancelScheduledCampaign,
}
