import { Request, Response, NextFunction } from 'express'
import { EmailService } from '@email/services'

const isEmailCampaignOwnedByUser = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  const { campaignId } = req.params
  const userId = req.session?.user?.id
  try {
    const campaign = EmailService.findCampaign(+campaignId, +userId) 
    return campaign ? next() : res.sendStatus(403)
  } catch (err) {
    return next(err)
  }
}

// Sends a test email
const storeCredentials = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { campaignId } = req.params
    const { recipient } = req.body
    await EmailService.sendTestMessage(+campaignId, recipient)
    await EmailService.updateCredentials(+campaignId)
  } catch (err) {
    return res.status(400).json({ message: `${err.message}` })
  }
  return res.json({ message: 'OK' })

}
const getCampaignDetails = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const { campaignId } = req.params
    const result = await EmailService.getCampaignDetails(+campaignId)
    return res.json({ campaign: result.campaign, 'num_recipients': result.numRecipients })
  } catch (err) {
    return next(err)
  }
}

const previewFirstMessage = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try{
    const { campaignId } = req.params
    return res.json({
      preview: await EmailService.getHydratedMessage(+campaignId),
    })
  } catch(err){
    return next(err)
  }
}

export const EmailMiddleware = {
  isEmailCampaignOwnedByUser, 
  storeCredentials, 
  getCampaignDetails, 
  previewFirstMessage, 
}
