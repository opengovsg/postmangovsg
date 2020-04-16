import { Request, Response, NextFunction } from 'express'
import { Campaign } from '@core/models'
import { EmailTemplate, EmailMessage } from '@email/models'
import { ChannelType } from '@core/constants'
import { mailClient } from '@core/services'
import { MailToSend } from '@core/interfaces'
import logger from '@core/logger'
import { template } from '@core/services/template.service'
import { EmailContent } from '@email/interfaces'

const sendEmail = async (mail: MailToSend): Promise<boolean> => {
  try {
    return mailClient.sendMail(mail)
  } catch (e) {
    logger.error(`Error while sending test email. error=${e}`)
    return false
  }
} 

const getEmailTemplate = async (campaignId: string) => {
  return await EmailTemplate.findOne({ where: { campaignId }, attributes:['body', 'subject'] })
}

const getEmailContent = async (campaignId: string): Promise<EmailContent | null> => {
  const emailTemplate = await getEmailTemplate(campaignId)
  if (emailTemplate === null) return null

  const { body, subject } = emailTemplate
  if (!body || !subject) return null

  return { subject, body }
}

const getParams = async (campaignId: string): Promise<{[key: string]: string} | null> => {
  const emailMessage = await EmailMessage.findOne({ where: { campaignId }, attributes:['params'] })
  if (!emailMessage) return null
  return emailMessage.params as {[key: string]: string}
}

const getHydratedMail = async (campaignId: string, recipientEmail: string): Promise<MailToSend | null> => {
  // get email content 
  const emailContent = await getEmailContent(campaignId)

  // Get params
  const params = await getParams(campaignId)

  if (emailContent === null || params === null) return null

  // get the body and subject 
  const { subject, body } = emailContent

  const hydratedBody = template(body, params)
  return { 
    recipients: [recipientEmail],
    body: hydratedBody,
    subject,
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
  const { email: recipientEmail } = req.body
  const { campaignId } = req.params

  const mail = await getHydratedMail(campaignId, recipientEmail)
  if (!mail) return res.sendStatus(400)

  // Send email using node mailer
  const isEmailSent = await sendEmail(mail)

  if (!isEmailSent) return res.sendStatus(500)

  res.json({ message: 'OK' })
}

export { isEmailCampaignOwnedByUser, storeCredentials }
