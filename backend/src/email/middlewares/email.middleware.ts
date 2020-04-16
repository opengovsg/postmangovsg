import { Request, Response, NextFunction } from 'express'
import { Campaign } from '@core/models'
import { ChannelType } from '@core/constants'
import { mailClient } from '@core/services'
import { MailToSend } from '@core/interfaces'
import logger from '@core/logger'

const sendEmail = async (recipient: string): Promise<string | void> => {
  // TODO: replace with hydrated email
  const mail: MailToSend = {
    recipients: [recipient],
    subject: 'Test Message',
    body: 'Test message from postman.',
  }
  try {
    return mailClient.sendMail(mail)
  } catch (e) {
    logger.error(`Error while sending test email. error=${e}`)
    return
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
  const { email: recipient } = req.body
  // Send email using node mailer
  const isEmailSent = await sendEmail(recipient)

  if (!isEmailSent) return res.sendStatus(500)

  res.json({ message: 'OK' })
}

export { isEmailCampaignOwnedByUser, storeCredentials }
