import { Request, Response, NextFunction } from 'express'
import { JobService } from '@core/services'
import { loggerWithLabel } from '@shared/core/logger'

const logger = loggerWithLabel(module)

/**
 * If the campaign has an associated credential, a template and valid csv uploaded,
 *  create a new sending job (or multiple sending jobs if send rate exceeds max_rate)
 * @param req
 * @param res
 * @param next
 */
const sendCampaign = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const userId = req.session?.user?.id
    const { campaignId } = req.params
    const { rate } = req.body
    const logMeta = { action: 'sendCampaign', campaignId }

    if (await JobService.canSendCampaign(+campaignId)) {
      const jobIds = await JobService.sendCampaign({
        campaignId: +campaignId,
        rate: +rate,
        userId,
      })
      logger.info({ message: 'Sending campaign', jobIds, ...logMeta })
      return res.status(200).json({ campaign_id: campaignId, job_id: jobIds })
    }

    const errorMessage =
      'Unable to send campaign due to invalid template, recipients, missing credentials, or campaign has been forcibly halted.'
    logger.error({ message: errorMessage, ...logMeta })
    return res.status(400).json({
      message: errorMessage,
    })
  } catch (err) {
    return next(err)
  }
}

/**
 *  Change the status of existing jobs for that campaign to STOPPED
 * @param req
 * @param res
 * @param next
 */
const stopCampaign = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { campaignId } = req.params
    await JobService.stopCampaign(+campaignId)
    logger.info({
      message: 'Stopped campaign',
      campaignId,
      action: 'stopCampaign',
    })
    return res.status(200).json({ campaign_id: campaignId })
  } catch (err) {
    return next(err)
  }
}

/**
 *  Change the status of existing jobs for that campaign to READY
 * @param req
 * @param res
 * @param next
 */
const retryCampaign = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
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
    return res.status(400).json({
      message: errorMessage,
    })
  } catch (err) {
    return next(err)
  }
}

export const JobMiddleware = {
  sendCampaign,
  stopCampaign,
  retryCampaign,
}
