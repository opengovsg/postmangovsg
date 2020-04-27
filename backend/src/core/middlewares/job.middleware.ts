import { Request, Response, NextFunction } from 'express'
import { createJob, stopCampaign as stop, retryCampaign as retry } from '@core/services'
import { Campaign } from '@core/models'
import { Op } from 'sequelize'
import config from '@core/config'
const sendCampaign = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try{
    const { campaignId } = req.params
    const rate = +req.body.rate
    const canSend = await Campaign.findOne({ where: { id: campaignId, valid: true, credName: { [Op.ne]: null } } })
    if(canSend){
      // Split jobs if the supplied send rate is higher than the rate 1 worker can support
      // As we want to minimize the number of workers being used, the rate is not distributed across workers.
      // Instead, each worker will operate at its max capacity. Eg: rate=400, maxRate=150 will be split into 150,150,100
      const jobs = []
      const numJobs = Math.ceil(rate / config.maxRatePerJob)
      for(let i=0; i<numJobs; i++) {
        const sendRate = Math.min(config.maxRatePerJob, rate - i*config.maxRatePerJob) 
        jobs.push(createJob({ campaignId: +campaignId, rate: sendRate }))
      }
      const jobIds = await Promise.all(jobs)
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