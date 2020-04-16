import { Request, Response, NextFunction } from 'express'
import { createJob, stopCampaign as stop, retryCampaign as retry } from '@core/services'
import { Campaign } from '@core/models'
import { Op } from 'Sequelize'
const sendCampaign = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try{
    const { campaignId } = req.params
    const { rate } = req.body
    const canSend = await Campaign.findOne({ where: { id: campaignId, valid: true, credName: { [Op.ne]: null } } })
    if(canSend){
      const jobId = await createJob({ campaignId: + campaignId, rate })
      return res.status(200).json({ 'campaign_id': campaignId, 'job_id': jobId })
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