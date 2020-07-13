import { Request, Response, NextFunction } from 'express'
import { ChannelType } from '@core/constants'
import {
  CampaignService,
  UploadService,
  ProtectedService,
} from '@core/services'

/**
 *  If a campaign already has an existing running job in the job queue, then it cannot be modified.
 * @param req
 * @param res
 * @param next
 */
const canEditCampaign = async (
  req: Request,
  res: Response,
  next: NextFunction,
  protect = false
): Promise<Response | void> => {
  try {
    const { campaignId } = req.params
    const [hasJob, csvStatus, isProtected] = await Promise.all([
      CampaignService.hasJobInProgress(+campaignId),
      UploadService.getCsvStatus(+campaignId),
      ProtectedService.isProtectedCampaign(+campaignId),
    ])
    if (!hasJob && !csvStatus?.isCsvProcessing && (isProtected || !protect)) {
      res.locals.isProtected = isProtected
      return next()
    } else {
      return res.sendStatus(403)
    }
  } catch (err) {
    return next(err)
  }
}

/**
 * Limit certain routes for protected campaigns only
 * @param req
 * @param res
 * @param next
 */
const canEditProtectedCampaign = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  return canEditCampaign(req, res, next, true)
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
      return res.sendStatus(403)
    }

    const userId = req.session?.user?.id
    const campaign = await CampaignService.createCampaign({
      name,
      type,
      userId,
      protect,
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
  try {
    const { offset, limit } = req.query
    const userId = req.session?.user?.id
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
  canEditProtectedCampaign,
  createCampaign,
  listCampaigns,
}
