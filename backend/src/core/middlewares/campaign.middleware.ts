import { Request, Response, NextFunction } from 'express'
import Logger from '@core/logger'
import { ChannelType } from '@core/constants'
import { CampaignService, UploadService } from '@core/services'

const logger = Logger.loggerWithLabel(module)

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
    logger.error({
      message: `Campaign cannot be edited`,
      campaignId,
      action: 'canEditCampaign',
    })
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
    }: { name: string; type: string; protect: boolean } = req.body

    // Check that protected campaign can only be created for emails
    if (protect && type !== ChannelType.Email) {
      logger.error({
        message: `Protected campaign cannot be created`,
        campaignType: type,
        action: 'createCampaign',
      })
      return res.sendStatus(403)
    }

    const userId = req.session?.user?.id
    const campaign = await CampaignService.createCampaign({
      name,
      type,
      userId,
      protect,
    })
    logger.info({
      message: 'Successfully created new campaign',
      id: userId,
      campaignId: campaign.id,
      action: 'createCampaign',
    })
    return res.status(201).json({
      id: campaign.id,
      name: campaign.name,
      created_at: campaign.createdAt,
      type: campaign.type,
      protect: campaign.protect,
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

export const CampaignMiddleware = {
  canEditCampaign,
  createCampaign,
  listCampaigns,
}
