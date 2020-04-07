import { Request, Response, NextFunction } from 'express'
import { Campaign } from '@core/models'
import { Sequelize } from 'sequelize-typescript'

const verifyCampaignOwner = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try{
    const { campaignId } = req.params
    const { id : userId } = req.session?.user
    const campaign = await Campaign.findOne({ where: { 'id': campaignId, userId } })
    return campaign ? next() : res.sendStatus(403)
  }
  catch(err){
    return next(err)
  }
}

// Create campaign
const createCampaign = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try{
    const { name, type }: { name: string; type: string} = req.body
    const { id: userId } = req.session?.user
    await Campaign.create({ name, type, userId, valid: false }) 
    return res.sendStatus(201)
  }
  catch(err){
    return next(err)
  }
 
}

// List campaigns
const listCampaigns = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try{
    const { offset, limit } = req.query 
    const { id : userId } = req.session?.user
    const options: { where: any; attributes: any; order: any; offset?: number; limit? : number} = {
      where: {
        userId,
      },
      attributes: [
        'id', 'name', 'type', 'created_at', 'valid', [Sequelize.literal('CASE WHEN "cred_name" IS NULL THEN False ELSE True END'), 'has_credential'],
      ],
      order: [
        ['created_at', 'DESC'],
      ],
    }
    if (offset) {
      options.offset = +offset
    }
    if(limit){
      options.limit = +limit
    }
  
    const campaigns = await Campaign.findAll(options)
    return res.json(campaigns)
  }catch(err){
    return next(err)
  }
}


export { verifyCampaignOwner, createCampaign, listCampaigns }