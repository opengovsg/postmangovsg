import { Request, Response, NextFunction } from 'express'
import { Campaign } from '@core/models'
import { ChannelType } from '@core/constants'
import { mailClient } from '@core/services'
import { MailToSend } from '@core/interfaces'
import logger from '@core/logger'

const sendEmail = async (email: string): Promise<boolean> => {
  // TODO: replace with hydrated email
  const mail: MailToSend = {
    recipients: [email],
    subject: 'Test Message',
    body: 'Test message from postman.',
  }
  try {
    return await mailClient.sendMail(mail)
  } catch (e) {
    logger.error(`Error while sending test email. error=${e}`)
    return false
  }
  

}

// TODO
const isEmailCampaignOwnedByUser = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try{
    const { campaignId } = req.params
    const { id: userId } = req.session?.user
    const campaign = await Campaign.findOne({ where: { id: +campaignId, userId, type: ChannelType.Email } })
    return campaign ? next() : res.sendStatus(400)
  }catch(err){
    return next(err)
  }
}

// Sends a test email
const storeCredentials = async (req: Request, res: Response): Promise<Response | void> => {
  const { email } = req.body
  // Send email using node mailer
  const isEmailSent = await sendEmail(email)

  if (!isEmailSent) return res.sendStatus(500)

  res.json({ message: 'OK' })
}

export { isEmailCampaignOwnedByUser, storeCredentials }
