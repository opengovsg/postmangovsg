import { Request, Response, NextFunction } from 'express'
import { CampaignService, TemplateService } from '@core/services'

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
      TemplateService.getCsvStatus(+campaignId),
    ])
    if (!hasJob && !csvStatus?.isCsvProcessing) {
      return next()
    } else {
      return res.sendStatus(403)
    }
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
      locked,
    }: { name: string; type: string; locked?: boolean } = req.body
    const userId = req.session?.user?.id
    const campaign = await CampaignService.createCampaign({
      name,
      type,
      userId,
      locked,
    })
    return res.status(201).json({
      id: campaign.id,
      name: campaign.name,
      created_at: campaign.createdAt,
      type: campaign.type,
      locked: campaign.locked,
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
  createCampaign,
  listCampaigns,
}
