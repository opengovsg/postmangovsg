import { Request, Response, NextFunction } from 'express'
import { loggerWithLabel } from '@core/logger'
import { ChannelType } from '@core/constants'
import { CampaignService, UploadService } from '@core/services'

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
    const campaign = await CampaignService.createCampaign({
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
  const { offset, limit } = req.query
  const userId = req.session?.user?.id
  try {
    const { rows, count } = await CampaignService.listCampaigns({
      offset,
      limit,
      userId,
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

export const CampaignMiddleware = {
  canEditCampaign,
  createCampaign,
  listCampaigns,
  isCampaignRedacted,
}
