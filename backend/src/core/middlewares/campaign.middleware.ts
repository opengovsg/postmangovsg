import { Request, Response, NextFunction } from 'express'
import { CampaignService } from '@core/services'


/**
 *  If a campaign already has an existing running job in the job queue, then it cannot be modified.
 * @param req
 * @param res
 * @param next
 */
const canEditCampaign = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const { campaignId } = req.params
    if(!CampaignService.hasJobInProgress(+campaignId)){
      return next() 
    } else{
      return res.sendStatus(403)
    }
  }
  catch (err) {
    return next(err)
  }
}

// Create campaign
const createCampaign = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const { name, type }: { name: string; type: string } = req.body
    const userId = req.session?.user?.id 
    const campaign = await CampaignService.createCampaign({ name, type, userId })
    return res.status(201).json({
      id: campaign.id,
      name: campaign.name,
      // eslint-disable-next-line @typescript-eslint/camelcase
      created_at: campaign.createdAt,
      type: campaign.type,
    })
  }
  catch (err) {
    return next(err)
  }

}

// List campaigns
const listCampaigns = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const { offset, limit } = req.query
    const userId = req.session?.user?.id 
    const campaigns = await CampaignService.listCampaigns({ offset, limit, userId })
    
    return res.json(campaigns)
  } catch (err) {
    return next(err)
  }
}



export const CampaignMiddleware = { canEditCampaign, createCampaign, listCampaigns }
