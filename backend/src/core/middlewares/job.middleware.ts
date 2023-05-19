import { Request, Response } from 'express'
import { JobService } from '@core/services'
import { loggerWithLabel } from '@core/logger'
import { ApiInvalidTemplateError } from '@core/errors/rest-api.errors'

const logger = loggerWithLabel(module)

/**
 * If the campaign has an associated credential, a template and valid csv uploaded,
 *  create a new sending job (or multiple sending jobs if send rate exceeds max_rate)
 * @param req
 * @param res
 * @param next
 */
const sendCampaign = async (req: Request, res: Response): Promise<Response> => {
  const userId = req.session?.user?.id
  const { campaignId } = req.params
  // also need to retrieve if its to be scheduled
  const { rate, scheduledTiming } = req.body
  const logMeta = { action: 'sendCampaign', campaignId }

  // convert scheduled timing to date object
  // if passed in then convert, if not just pass null
  const formattedTiming = scheduledTiming ? new Date(scheduledTiming) : null
  if (await JobService.canSendCampaign(+campaignId)) {
    let jobIds
    let jobCount = 0
    if (formattedTiming) {
      // this is a scheduled campaign, it is trying to update the existing jobs.
      // directly update the DB, do not go into sending again.
      // check if existing jobs exists
      jobCount = await JobService.updateScheduledCampaign(
        +campaignId,
        formattedTiming
      )
    }
    if (jobCount == 0) {
      jobIds = await JobService.sendCampaign({
        campaignId: +campaignId,
        rate: +rate,
        userId,
        scheduledTiming: formattedTiming,
      })
    }
    logger.info({ message: 'Sending campaign', jobIds, ...logMeta })
    return res.status(200).json({ campaign_id: campaignId, job_id: jobIds })
  }

  const errorMessage =
    'Unable to send campaign due to invalid template, recipients, missing credentials, or campaign has been forcibly halted.'
  logger.error({ message: errorMessage, ...logMeta })
  throw new ApiInvalidTemplateError(errorMessage)
}

/**
 *  Change the status of existing jobs for that campaign to READY
 * @param req
 * @param res
 * @param next
 */
const retryCampaign = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { campaignId } = req.params
  const logMeta = { campaignId, action: 'retryCampaign' }
  if (await JobService.canSendCampaign(+campaignId)) {
    await JobService.retryCampaign(+campaignId)
    logger.info({ message: 'Retry campaign', ...logMeta })
    return res.status(200).json({ campaign_id: campaignId })
  }
  const errorMessage =
    'Unable to send campaign due to invalid template, recipients, missing credentials, or campaign has been forcibly halted.'
  logger.error({ message: errorMessage, ...logMeta })
  throw new ApiInvalidTemplateError(errorMessage)
}

const cancelScheduledCampaign = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { campaignId } = req.params
  const logMeta = { campaignId, action: 'cancelScheduledCampaign' }
  logger.info({
    message: 'Cancel Scheduled Campaign...',
    logMeta,
  })
  await JobService.cancelJobQueues(+campaignId)
  return res.status(200).json({ id: campaignId })
}

export const JobMiddleware = {
  sendCampaign,
  retryCampaign,
  cancelScheduledCampaign,
}
