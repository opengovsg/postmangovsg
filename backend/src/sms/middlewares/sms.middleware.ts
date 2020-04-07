import { Request, Response, NextFunction } from 'express'
import { Campaign } from '@core/models'
import { ChannelType } from '@core/constants'

// TODO
const isSmsCampaignOwnedByUser = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try{
    const { campaignId } = req.params
    const { id: userId } = req.session?.user
    const campaign = await Campaign.findOne({ where: { id: +campaignId, userId, type: ChannelType.SMS } })
    return campaign ? next() : res.sendStatus(400)
  }catch(err){
    return next(err)
  }
}

export { isSmsCampaignOwnedByUser }
