import { Request, Response, NextFunction } from 'express'
import { createJob, stopCampaign as stop, retryCampaign as retry } from '@core/services'
const sendCampaign = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try{
    const { campaignId } = req.params
    const { rate } = req.body
    const jobId = await createJob({ campaignId: + campaignId, rate })
    return res.status(200).json({ 'campaign_id': campaignId, 'job_id': jobId })
  }
  catch(err){
    return next(err)
  }
}

const stopCampaign = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try{
    const { campaignId } = req.params
    await stop(+campaignId)
    return res.status(200).json({ 'campaign_id': campaignId })
  }
  catch(err){
    return next(err)
  }
}

const retryCampaign = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try{
    const { campaignId } = req.params
    await retry(+campaignId)
    return res.status(200).json({ 'campaign_id': campaignId })
  }
  catch(err){
    return next(err)
  }
}


export {
  sendCampaign,
  stopCampaign,
  retryCampaign,
}