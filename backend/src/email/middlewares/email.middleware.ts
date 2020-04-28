import { Request, Response, NextFunction } from 'express'
import { literal } from 'sequelize'
import { Campaign, JobQueue } from '@core/models'
import { EmailTemplate, EmailMessage } from '@email/models'
import { ChannelType } from '@core/constants'
import { mailClient } from '@core/services'
import { MailToSend, CampaignDetails } from '@core/interfaces'
import logger from '@core/logger'
import { template } from '@core/services/template.service'
import { EmailContent } from '@email/interfaces'


const sendEmail = async (mail: MailToSend): Promise<string | void> => {
  try {
    return mailClient.sendMail(mail)
  } catch (e) {
    logger.error(`Error while sending test email. error=${e}`)
    return
  }
}

const getEmailTemplate = (campaignId: number): Promise<EmailTemplate> => {
  return EmailTemplate.findOne({ where: { campaignId }, attributes: ['body', 'subject'] })
}

const getEmailContent = async (campaignId: number): Promise<EmailContent | void> => {
  const emailTemplate = await getEmailTemplate(campaignId)
  if (emailTemplate === null) return 

  const { body, subject } = emailTemplate
  if (!body || !subject) return 

  return { subject, body }
}

const getParams = async (campaignId: number): Promise<{ [key: string]: string } | void> => {
  const emailMessage = await EmailMessage.findOne({ where: { campaignId }, attributes: ['params'] })
  if (!emailMessage) return
  return emailMessage.params as { [key: string]: string }
}

const hydrateFirstMessage = async (campaignId: number): Promise<{ body: string; subject: string } | void> => {
  // get email content 
  const emailContent = await getEmailContent(campaignId)

  // Get params
  const params = await getParams(campaignId)
  
  if (!emailContent || !params) return

  const subject = template(emailContent.subject, params)
  const body = template(emailContent.body, params)
  return { body, subject }
}

const getHydratedMail = async (campaignId: number, recipient: string): Promise<MailToSend | void> => {
  // get the body and subject 
  const message = await hydrateFirstMessage(campaignId)
  if (message){
    const mailToSend: MailToSend=  ({
      recipients: [recipient],
      ...message,
    })
    return mailToSend
  }
  return 
}

// TODO
const isEmailCampaignOwnedByUser = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const { campaignId } = req.params
    const { id: userId } = req.session?.user
    const campaign = await Campaign.findOne({ where: { id: +campaignId, userId, type: ChannelType.Email } })
    return campaign ? next() : res.sendStatus(400)
  } catch (err) {
    return next(err)
  }
}

// Sends a test email
const storeCredentials = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const { campaignId } = req.params
    const { recipient } = req.body

    const mail = await getHydratedMail(+campaignId, recipient)
    if (!mail) return res.sendStatus(400)
    // Send email using node mailer
    const isEmailSent = await sendEmail(mail)
    if (!isEmailSent) {
      return res.sendStatus(500)
    }
    else {
      await Campaign.update({ credName: 'EMAIL_DEFAULT' }, { where: { id: +campaignId } })
      return res.json({ message: 'OK' })
    }
  } catch (err) {
    return next(err)
  }

}
const getCampaignDetails = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const { campaignId } = req.params
    const campaign: CampaignDetails =  (await Campaign.findOne({ 
      where: { id: +campaignId }, 
      attributes: [
        'id', 'name', 'type', 'created_at', 'valid',
        [literal('CASE WHEN "cred_name" IS NULL THEN False ELSE True END'), 'has_credential'],
        [literal('s3_object -> \'filename\''), 'csv_filename'],
      ],
      include: [
        {
          model: JobQueue,
          attributes: ['status', ['created_at', 'sent_at']],
        },
        {
          model: EmailTemplate,
          attributes: ['body', 'subject', 'params'],
        }],
    }))?.get({ plain: true }) as CampaignDetails

    const numRecipients: number = await EmailMessage.count(
      {
        where: { campaignId: +campaignId },
      }
    )

    return res.json({ campaign, 'num_recipients': numRecipients })
  } catch (err) {
    return next(err)
  }
}

const previewFirstMessage = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try{
    const { campaignId } = req.params
    return res.json({
      preview: await hydrateFirstMessage(+campaignId),
    })
  } catch(err){
    return next(err)
  }
}

export { isEmailCampaignOwnedByUser, storeCredentials, getCampaignDetails, previewFirstMessage }
