import { Request, Response, NextFunction } from 'express'
import { JobService } from '@core/services'

const sendCampaign = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try{
    const { campaignId } = req.params
    const { rate } = req.body
    if(await JobService.canSendCampaign(+campaignId)){
      const jobIds = await JobService.sendCampaign({ campaignId: +campaignId, rate: +rate })
      return res.status(200).json({ 'campaign_id': campaignId, 'job_id': jobIds })
    }
    return res.status(400).json({ message: 'Unable to send campaign due to invalid template, recipients or missing credentials.' })
  }
  catch(err){
    return next(err)
  }
}

const stopCampaign = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try{
    const { campaignId } = req.params
    await JobService.stopCampaign(+campaignId)
    return res.status(200).json({ 'campaign_id': campaignId })
  }
  catch(err){
    return next(err)
  }
}

const retryCampaign = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try{
    const { campaignId } = req.params
    await JobService.retryCampaign(+campaignId)
    return res.status(200).json({ 'campaign_id': campaignId })
  }
  catch(err){
    return next(err)
  }
}


export const JobMiddleware = {
  sendCampaign,
  stopCampaign,
  retryCampaign,
}
