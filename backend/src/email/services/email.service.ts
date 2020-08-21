import { Transaction } from 'sequelize'
import logger from '@core/logger'
import { CSVParams } from '@core/types'

import { ChannelType } from '@core/constants'
import { Campaign, ProtectedMessage } from '@core/models'
import {
  MailService,
  CampaignService,
  UploadService,
  ProtectedService,
  UnsubscriberService,
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
      body: UnsubscriberService.appendTestEmailUnsubLink(body),
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

const uploadCompleteOnPreview = ({
  transaction,
  template,
  campaignId,
}: {
  transaction: Transaction
  template: EmailTemplate
  campaignId: number
}): ((data: CSVParams[]) => Promise<void>) => {
  return async (data: CSVParams[]): Promise<void> => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    UploadService.checkTemplateKeysMatch(data, template.params!)

    EmailTemplateService.testHydration(
      [{ params: data[0] }],
      template.body as string,
      template.subject as string
    )

    // delete message_logs entries
    await EmailMessage.destroy({
      where: { campaignId },
      transaction,
    })
  }
}
const uploadCompleteOnChunk = ({
  transaction,
  campaignId,
}: {
  transaction: Transaction
  campaignId: number
}): ((data: CSVParams[]) => Promise<void>) => {
  return async (data: CSVParams[]): Promise<void> => {
    const records: Array<MessageBulkInsertInterface> = data.map((entry) => {
      return {
        campaignId,
        recipient: entry['recipient'],
        params: entry,
      }
    })
    // START populate template
    await EmailMessage.bulkCreate(records, {
      transaction,
      logging: (_message, benchmark) => {
        if (benchmark) {
          logger.info(`uploadCompleteOnChunk: ElapsedTime ${benchmark} ms`)
        }
      },
      benchmark: true,
    })
  }
}

const uploadProtectedCompleteOnPreview = ({
  transaction,
  template,
  campaignId,
}: {
  transaction: Transaction
  template: EmailTemplate
  campaignId: number
}): ((data: CSVParams[]) => Promise<void>) => {
  return async (data: CSVParams[]): Promise<void> => {
    // Checks the csv for all the necessary columns.
    const PROTECTED_CSV_HEADERS = ['recipient', 'payload', 'passwordhash', 'id']
    UploadService.checkTemplateKeysMatch(data, PROTECTED_CSV_HEADERS)

    EmailTemplateService.testHydration(
      [{ params: data[0] }],
      template.body as string,
      template.subject as string
    )
    await Promise.all([
      // Delete existing protected messages
      ProtectedMessage.destroy({
        where: { campaignId },
        transaction,
      }),
      // Delete existing email messages
      EmailMessage.destroy({
        where: { campaignId },
        transaction,
      }),
    ])
  }
}
const uploadProtectedCompleteOnChunk = ({
  transaction,
  campaignId,
}: {
  transaction: Transaction
  campaignId: number
}): ((data: CSVParams[]) => Promise<void>) => {
  return async (data: CSVParams[]): Promise<void> => {
    const messages = await ProtectedService.storeProtectedMessages({
      transaction,
      campaignId,
      data,
    })
    await EmailMessage.bulkCreate(messages, {
      transaction,
      logging: (_message, benchmark) => {
        if (benchmark) {
          logger.info(
            `uploadProtectedCompleteOnChunk - EmailMessage: ElapsedTime ${benchmark} ms`
          )
        }
      },
      benchmark: true,
    })
  }
}

export const EmailService = {
  findCampaign,
  sendCampaignMessage,
  setCampaignCredential,
  getCampaignDetails,
  getHydratedMessage,
  uploadCompleteOnPreview,
  uploadCompleteOnChunk,
  uploadProtectedCompleteOnPreview,
  uploadProtectedCompleteOnChunk,
}
