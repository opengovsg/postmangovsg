import { Transaction } from 'sequelize'

import logger from '@core/logger'
import { ChannelType } from '@core/constants'
import { Campaign } from '@core/models'
import {
  MailService,
  CampaignService,
  StatsService,
  UploadService,
} from '@core/services'
import { MailToSend, CampaignDetails } from '@core/interfaces'

import { EmailTemplate, EmailMessage } from '@email/models'
import { EmailTemplateService } from '@email/services'

/**
 * Gets a message's parameters
 * @param campaignId
 */
const getParams = async (
  campaignId: number
): Promise<{ [key: string]: string } | void> => {
  const emailMessage = await EmailMessage.findOne({
    where: { campaignId },
    attributes: ['params'],
  })
  if (!emailMessage) return
  return emailMessage.params as { [key: string]: string }
}

/**
 * Replaces template's attributes with a message's parameters to return the hydrated message
 * @param campaignId
 */
const getHydratedMessage = async (
  campaignId: number
): Promise<{
  body: string
  subject: string
  replyTo: string | null
} | void> => {
  // get email template
  const template = await EmailTemplateService.getFilledTemplate(campaignId)

  // Get params
  const params = await getParams(campaignId)

  if (!template || !params) return

  /* eslint-disable @typescript-eslint/no-non-null-assertion */
  const subject = EmailTemplateService.client.template(
    template?.subject!,
    params
  )
  const body = EmailTemplateService.client.template(template?.body!, params)
  /* eslint-enable @typescript-eslint/no-non-null-assertion */
  return { body, subject, replyTo: template.replyTo || null }
}

/**
 * Formats mail into format that node mailer accepts
 * @param campaignId
 * @param recipient
 */
const getCampaignMessage = async (
  campaignId: number,
  recipient: string
): Promise<MailToSend | void> => {
  // get the body and subject
  const message = await getHydratedMessage(campaignId)
  if (message) {
    const { body, subject, replyTo } = message
    const mailToSend: MailToSend = {
      recipients: [recipient],
      body,
      subject,
      ...(replyTo ? { replyTo } : {}),
    }
    return mailToSend
  }
  return
}

/**
 * Sends message
 * @param mail
 */
const sendEmail = async (mail: MailToSend): Promise<string | void> => {
  try {
    return MailService.mailClient.sendMail(mail)
  } catch (e) {
    logger.error(`Error while sending test email. error=${e}`)
    return
  }
}

/**
 * Helper method to find an email campaign owned by that user
 * @param campaignId
 * @param userId
 */
const findCampaign = (
  campaignId: number,
  userId: number
): Promise<Campaign> => {
  return Campaign.findOne({
    where: { id: +campaignId, userId, type: ChannelType.Email },
  })
}

/**
 * Sends a templated email to the campaign admin
 * @param campaignId
 * @param recipient
 * @throws Error if it cannot send an email
 */
const sendCampaignMessage = async (
  campaignId: number,
  recipient: string
): Promise<void> => {
  const mail = await getCampaignMessage(+campaignId, recipient)
  if (!mail) throw new Error('No message to send')
  // Send email using node mailer
  const isEmailSent = await sendEmail(mail)
  if (!isEmailSent) throw new Error(`Could not send test email to ${recipient}`)
}

/**
 * As email credentials are shared globally amongst campaigns,
 * update the credential column for the campaign with the default credential
 * @param campaignId
 */
const setCampaignCredential = (
  campaignId: number
): Promise<[number, Campaign[]]> => {
  return Campaign.update(
    { credName: 'EMAIL_DEFAULT' },
    { where: { id: campaignId } }
  )
}

/**
 * Gets details of a campaign
 * @param campaignId
 */
const getCampaignDetails = async (
  campaignId: number
): Promise<CampaignDetails> => {
  return await CampaignService.getCampaignDetails(campaignId, [
    {
      model: EmailTemplate,
      attributes: ['body', 'subject', 'params', 'reply_to'],
    },
  ])
}

/**
 * Updates the campaign and email_messages table in a transaction, rolling back when either fails.
 * For campaign table, the s3 meta data is updated with the uploaded file, and its validity is set to true.
 * For email_messages table, existing records are deleted and new ones are bulk inserted.
 * Then update statistics with new unsent count
 * @param key
 * @param campaignId
 * @param filename
 * @param records
 */
const updateCampaignAndMessages = async (
  campaignId: number,
  key: string,
  filename: string,
  records: MessageBulkInsertInterface[],
  transaction?: Transaction
): Promise<void> => {
  try {
    if (!transaction) {
      transaction = await Campaign.sequelize?.transaction()
    }
    // Updates metadata in project
    await UploadService.replaceCampaignS3Metadata(
      campaignId,
      key,
      filename,
      transaction
    )

    // START populate template
    await EmailTemplateService.addToMessageLogs(
      campaignId,
      records,
      transaction
    )

    // Update statistic table
    await StatsService.setNumRecipients(campaignId, records.length, transaction)

    // Set campaign to valid
    await CampaignService.setValid(campaignId, transaction)

    transaction?.commit()
  } catch (err) {
    transaction?.rollback()
    throw err
  }
}

export const EmailService = {
  findCampaign,
  sendCampaignMessage,
  setCampaignCredential,
  getCampaignDetails,
  getHydratedMessage,
  updateCampaignAndMessages,
}
