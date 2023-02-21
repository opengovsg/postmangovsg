import { NextFunction, Request, Response } from 'express'
import { loggerWithLabel } from '@core/logger'
import {
  CampaignSortField,
  ChannelType,
  Ordering,
  Status,
} from '@core/constants'
import { CampaignService, UploadService } from '@core/services'
import { Campaign } from '@core/models'

const logger = loggerWithLabel(module)

/**
 *  If a campaign already has an existing running job in the job queue, then it cannot be modified.
 * @param req
 * @param res
 * @param next
 */
const canEditCampaign = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { campaignId } = req.params
    const [hasJob, csvStatus] = await Promise.all([
      CampaignService.hasJobInProgress(+campaignId),
      UploadService.getCsvStatus(+campaignId),
    ])
    if (!hasJob && !csvStatus?.isCsvProcessing) {
      return next()
    }
    return res.sendStatus(403)
  } catch (err) {
    return next(err)
  }
}

const canSendCampaign = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
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
    return res.sendStatus(403)
  } catch (err) {
    return next(err)
  }
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
      return res.status(400).json({
        message: `Unable to create campaign with these parameters`,
      })
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
 * @param next
 */
const listCampaigns = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  const { offset, limit, type, status, name, sort_by, order_by } = req.query
  const userId = req.session?.user?.id

  try {
    const { rows, count } = await CampaignService.listCampaigns({
      userId,
      offset: +(offset as string),
      limit: +(limit as string),
      type: type as ChannelType,
      status: status as Status,
      name: name as string,
      sortBy: sort_by as CampaignSortField,
      orderBy: order_by as Ordering,
    })

    return res.json({
      campaigns: rows,
      total_count: count,
    })
  } catch (err) {
    return next(err)
  }
}

/**
 * If a campaign has been redacted, it can no longer be exported
 * @param req
 * @param res
 * @param next
 */
const isCampaignRedacted = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  const { campaignId } = req.params
  try {
    const campaign = await CampaignService.getCampaignDetails(+campaignId, [])
    if (campaign.redacted) {
      logger.error({
        message: 'Campaign has been redacted',
        campaignId: campaign.id,
        action: 'isCampaignRedacted',
      })

      return res.status(410).json({
        message: 'Campaign has been redacted',
      })
    }
    next()
  } catch (err) {
    return next(err)
  }
}

const deleteCampaign = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const campaignId = +req.params.campaignId
    const deletedRows = await CampaignService.deleteCampaign(campaignId)
    if (deletedRows < 1) {
      logger.error({
        message: 'Campaign not found',
        campaignId: campaignId,
        action: 'deleteCampaign',
      })

      return res
        .status(404)
        .json({ message: `Campaign ${campaignId} not found` })
    }

    res.json({})
  } catch (e) {
    console.error(e)
    return next(e)
  }
}

const updateCampaign = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
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

      return res
        .status(404)
        .json({ message: `Campaign ${campaignId} not found` })
    }

    res.json(rows[0])
  } catch (err) {
    return next(err)
  }
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
