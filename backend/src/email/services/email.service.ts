import { literal } from 'sequelize'
import { Campaign, JobQueue } from '@core/models'
import { EmailTemplate, EmailMessage } from '@email/models'
import { TemplateService, mailClient } from '@core/services'
import { MailToSend, GetCampaignDetailsOutput, CampaignDetails } from '@core/interfaces'
import { EmailContent } from '@email/interfaces'
import logger from '@core/logger'
import { ChannelType } from '@core/constants'

  
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
  
  const subject = TemplateService.template(emailContent.subject, params)
  const body = TemplateService.template(emailContent.body, params)
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

const sendEmail = async (mail: MailToSend): Promise<string | void> => {
  try {
    return mailClient.sendMail(mail)
  } catch (e) {
    logger.error(`Error while sending test email. error=${e}`)
    return
  }
}
  
const findCampaign = (campaignId: number, userId: number): Promise<Campaign> => {
  return Campaign.findOne({ where: { id: +campaignId, userId, type: ChannelType.Email } })
}
/**
 * Sends a templated email to the campaign admin
 * @param campaignId 
 * @param recipient 
 * @throws Error if it cannot send an email
 */
const sendTestEmail = async (campaignId: number, recipient: string): Promise<void> => {
  const mail = await getHydratedMail(+campaignId, recipient)
  if (!mail) throw new Error('No message to send')
  // Send email using node mailer
  const isEmailSent = await sendEmail(mail)
  if (!isEmailSent) throw new Error(`Could not send test email to ${recipient}`)
}

const updateCredentials = (campaignId: number): Promise<[number, Campaign[]]> => {
  return Campaign.update({ credName: 'EMAIL_DEFAULT' }, { where: { id: campaignId } })

}

const getCampaignDetails = async (campaignId: number): Promise<GetCampaignDetailsOutput> => {
  const campaignDetails: CampaignDetails =  (await Campaign.findOne({ 
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
  return { campaign: campaignDetails, numRecipients }
}

export const EmailService = {
  findCampaign,
  sendTestEmail,
  updateCredentials,
  getCampaignDetails,
  hydrateFirstMessage,
}