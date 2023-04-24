import { NextFunction, Request, Response } from 'express'
import { loggerWithLabel } from '@core/logger'
import {
  CampaignSortField,
  CampaignStatus,
  ChannelType,
  Ordering,
} from '@core/constants'
import { CampaignService, JobService, UploadService } from '@core/services'
import { Campaign } from '@core/models'
import {
  ApiAlreadySentError,
  ApiAuthorizationError,
  ApiCampaignRedactedError,
  ApiInvalidParametersError,
  ApiNotFoundError,
} from '@core/errors/rest-api.errors'

const logger = loggerWithLabel(module)

/**
 *  If a campaign already has an existing running job in the job queue, then it cannot be modified.
 * @param req
 * @param res
 * @param next
 */
const canEditCampaign = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const { campaignId } = req.params
  const [hasJob, csvStatus] = await Promise.all([
    CampaignService.hasJobInProgress(+campaignId),
    UploadService.getCsvStatus(+campaignId),
  ])
  if (!hasJob && !csvStatus?.isCsvProcessing) {
    return next()
  }

  throw new ApiAuthorizationError(
    "Campaign can't be edited at the moment as there're ongoing uploads or jobs"
  )
}

const canSendCampaign = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const { campaignId } = req.params
  const [sentJobs] = await Promise.all([
    CampaignService.hasAlreadyBeenSent(+campaignId),
  ])
  logger.info({
    message: 'Checking can send campaign',
    sentJobs,
    action: 'canSendCampaign',
  })
  if (sentJobs <= 0) {
    return next()
  }
  throw new ApiAlreadySentError(
    "Campaign has been sent before and can't be resent"
  )
}

/**
 *  Create a campaign
 * @param req
 * @param res
 * @param next
 */
const createCampaign = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const {
      name,
      type,
      protect,
      demo_message_limit: demoMessageLimit,
    }: {
      name: string
      type: string
      protect: boolean
      demo_message_limit: number | null
    } = req.body

    // Check that protected campaign can only be created for emails
    if (protect && type !== ChannelType.Email) {
      return res.sendStatus(403)
    }
    const userId = req.session?.user?.id
    const campaign = await CampaignService.createCampaignWithTransaction({
      name,
      type,
      userId,
      protect,
      demoMessageLimit,
    })
    if (!campaign) {
      throw new ApiInvalidParametersError(
        'Unable to create campaign with these parameters'
      )
    }
    logger.info({
      message: 'Successfully created new campaign',
      campaignId: campaign.id,
      action: 'createCampaign',
    })

    return res.status(201).json({
      id: campaign.id,
      name: campaign.name,
      created_at: campaign.createdAt,
      type: campaign.type,
      protect: campaign.protect,
      demo_message_limit: campaign.demoMessageLimit,
    })
  } catch (err) {
    return next(err)
  }
}

/**
 * List campaigns for user
 * @param req
 * @param res
 */
const listCampaigns = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  const { offset, limit, type, status, name, sort_by, order_by } = req.query
  const userId = req.session?.user?.id

  const { rows, count } = await CampaignService.listCampaigns({
    userId,
    offset: +(offset as string),
    limit: +(limit as string),
    type: type as ChannelType,
    status: status as CampaignStatus,
    name: name as string,
    sortBy: sort_by as CampaignSortField,
    orderBy: order_by as Ordering,
  })

  return res.json({
    campaigns: rows,
    total_count: count,
  })
}

/**
 * If a campaign has been redacted, it can no longer be exported
 * @param req
 * @param res
 * @param next
 */
const isCampaignRedacted = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const { campaignId } = req.params
  const campaign = await CampaignService.getCampaignDetails(+campaignId, [])
  if (campaign.redacted) {
    logger.error({
      message: 'Campaign has been redacted',
      campaignId: campaign.id,
      action: 'isCampaignRedacted',
    })

    throw new ApiCampaignRedactedError(
      `Campaign ${campaignId} has been redacted`
    )
  }
  next()
}

const deleteCampaign = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  const campaignId = +req.params.campaignId
  const deletedRows = await CampaignService.deleteCampaign(campaignId)
  if (deletedRows < 1) {
    logger.error({
      message: 'Campaign not found',
      campaignId: campaignId,
      action: 'deleteCampaign',
    })

    throw new ApiNotFoundError(`Campaign ${campaignId} not found`)
  }
  // also delete any related job_queues, possible cases include
  // scheduled campaigns, and campaigns that queue up due to high load.
  await JobService.cancelJobQueues(campaignId)

  res.status(200).json({ id: campaignId })
}

const updateCampaign = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  const { campaignId } = req.params
  const { name, should_save_list, should_bcc_to_me } = req.body
  const [count, rows] = await CampaignService.updateCampaign({
    id: +campaignId,
    name,
    shouldSaveList: should_save_list,
    shouldBccToMe: should_bcc_to_me,
  } as Campaign)
  if (count < 1) {
    logger.error({
      message: 'Campaign not found',
      campaignId: campaignId,
      action: 'updateCampaign',
    })

    throw new ApiNotFoundError(`Campaign ${campaignId} not found`)
  }

  res.json(rows[0])
}

export const CampaignMiddleware = {
  canEditCampaign,
  canSendCampaign,
  createCampaign,
  listCampaigns,
  isCampaignRedacted,
  deleteCampaign,
  updateCampaign,
}
