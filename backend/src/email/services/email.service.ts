import { Transaction } from 'sequelize'
import { CSVParams } from '@core/types'

import { loggerWithLabel } from '@core/logger'
import { ChannelType, DefaultCredentialName } from '@core/constants'
import { Agency, Campaign, Domain, ProtectedMessage, User } from '@core/models'
import {
  MailService,
  CampaignService,
  UploadService,
  ProtectedService,
  UnsubscriberService,
} from '@core/services'
import { CampaignDetails } from '@core/interfaces'
import { MailToSend, SendEmailOpts } from '@shared/clients/mail-client.class'

import { EmailTemplate, EmailMessage, EmailBlacklist } from '@email/models'
import { EmailTemplateService } from '@email/services'
import config from '@core/config'
import { EmailDuplicateCampaignDetails } from '@email/interfaces'

import { ThemeClient } from '@shared/theme'
import { MessageBulkInsertInterface } from '@core/interfaces/message.interface'

const logger = loggerWithLabel(module)

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
  from: string
  agencyName: string | undefined
  agencyLogoURI: string | undefined
  showMasthead?: boolean
} | void> => {
  // get email template
  const template = await EmailTemplateService.getFilledTemplate(campaignId)

  // Get params
  const params = await getParams(campaignId)

  if (!template || !params) return

  /* eslint-disable @typescript-eslint/no-non-null-assertion */
  const subject = EmailTemplateService.client.template(
    template?.subject as string,
    params
  )
  const body = EmailTemplateService.client.template(
    template?.body as string,
    params
  )

  // Get agency details (if exists) from campaign user
  const campaign = await Campaign.findOne({
    where: { id: campaignId },
    include: [
      {
        model: User,
        include: [
          {
            model: Domain,
            include: [Agency],
          },
        ],
      },
    ],
  })
  const agency = campaign?.user?.domain?.agency
  const agencyName = agency?.name
  // if showLogo is disabled for template, don't return an agency logo
  const agencyLogoURI = template?.showLogo ? agency?.logo_uri : undefined

  const showMasthead = campaign?.user?.email.endsWith(
    config.get('showMastheadDomain')
  )

  return {
    body,
    subject,
    replyTo: template.replyTo || null,
    from: template?.from as string,
    agencyName,
    agencyLogoURI,
    showMasthead,
  }
  /* eslint-enable @typescript-eslint/no-non-null-assertion */
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
    const {
      body,
      subject,
      replyTo,
      from,
      agencyName,
      agencyLogoURI,
      showMasthead,
    } = message
    const mailToSend: MailToSend = {
      from: from || config.get('mailFrom'),
      recipients: [recipient],
      body: await ThemeClient.generateThemedHTMLEmail({
        body,
        unsubLink: UnsubscriberService.generateTestUnsubLink(),
        agencyName,
        agencyLogoURI,
        showMasthead,
      }),
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
const sendEmail = async (
  mail: MailToSend,
  opts?: SendEmailOpts
): Promise<boolean> => {
  try {
    const serviceProviderMessageId = await MailService.mailClient.sendMail(
      mail,
      opts
    )
    logger.info({
      message: 'Message sent to channel provider.',
      nativeMessageId: mail.messageId,
      serviceProviderMessageId,
    })
  } catch (e) {
    logger.error({
      message: 'Error while sending test email',
      error: e,
      action: 'sendEmail',
    })
    return false
  }
  return true
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
  }) as Promise<Campaign>
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
  if (!mail) {
    throw new Error('No message to send')
  }
  // Send email using node mailer
  const isEmailSent = await sendEmail(mail)
  if (!isEmailSent) throw new Error(`Could not send test email to ${recipient}`)
}

/**
 * As email credentials are shared globally amongst campaigns,
 * update the credential column for the campaign with the default credential
 * @param campaignId
 */
const setCampaignCredential = (campaignId: number): Promise<[number]> => {
  return Campaign.update(
    { credName: DefaultCredentialName.Email },
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
      attributes: [
        'body',
        'subject',
        'params',
        'reply_to',
        'from',
        'show_logo',
      ],
    },
    {
      model: User,
      attributes: ['email_domain'],
      include: [
        {
          model: Domain,
          attributes: ['agency_id'],
          include: [
            {
              model: Agency,
              attributes: ['name', 'logo_uri'],
            },
          ],
        },
      ],
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
    const { shouldBccToMe, user } = (await Campaign.findOne({
      where: {
        id: campaignId,
      },
      include: User,
    })) as Campaign
    const records: Array<MessageBulkInsertInterface> = data.map((entry) => {
      const { recipient } = entry
      return {
        campaignId,
        recipient: recipient.trim().toLowerCase(),
        params: shouldBccToMe ? { ...entry, bcc: user.email } : entry,
      }
    })
    // START populate template
    await EmailMessage.bulkCreate(records as Array<EmailMessage>, {
      transaction,
      logging: (_message, benchmark) => {
        if (benchmark) {
          logger.info({
            message: 'uploadCompleteOnChunk: ElapsedTime in ms',
            benchmark,
            campaignId,
            action: 'uploadCompleteOnChunk',
          })
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
    await EmailMessage.bulkCreate(messages as Array<EmailMessage>, {
      transaction,
      logging: (_message, benchmark) => {
        if (benchmark) {
          logger.info({
            message: 'uploadProtectedCompleteOnChunk: ElapsedTime in ms',
            benchmark,
            campaignId,
            action: 'uploadProtectedCompleteOnChunk',
          })
        }
      },
      benchmark: true,
    })
  }
}

const duplicateCampaign = async ({
  campaignId,
  name,
}: {
  campaignId: number
  name: string
}): Promise<Campaign | void> => {
  const campaign = (
    await Campaign.findByPk(campaignId, {
      attributes: ['type', 'user_id', 'protect', 'demo_message_limit'],
      include: [
        {
          model: EmailTemplate,
          attributes: ['body', 'subject', 'reply_to', 'from'],
        },
      ],
    })
  )?.get({ plain: true }) as unknown as EmailDuplicateCampaignDetails

  if (campaign) {
    const duplicatedCampaign = await Campaign.sequelize?.transaction(
      async (transaction) => {
        const duplicate = await CampaignService.createCampaign({
          name,
          type: campaign.type,
          userId: campaign.user_id,
          protect: campaign.protect,
          demoMessageLimit: campaign.demo_message_limit,
          transaction,
        })
        if (duplicate && campaign.email_templates) {
          const template = campaign.email_templates
          // Even if a campaign did not have an associated saved template, it can still be duplicated
          await EmailTemplate.create(
            {
              campaignId: duplicate.id,
              body: template.body,
              subject: template.subject,
              from: template.from,
              replyTo: template.reply_to,
            } as EmailTemplate,
            { transaction }
          )
        }
        return duplicate
      }
    )
    return duplicatedCampaign
  }

  return
}

const findBlacklistedRecipients = async (
  recipientEmails: string[]
): Promise<string[]> => {
  const result = await EmailBlacklist.findAll({
    where: {
      recipient: recipientEmails,
    },
  })
  return result.map((r) => r.recipient)
}

export const EmailService = {
  findCampaign,
  sendCampaignMessage,
  setCampaignCredential,
  getCampaignDetails,
  getHydratedMessage,
  findBlacklistedRecipients,
  uploadCompleteOnPreview,
  uploadCompleteOnChunk,
  uploadProtectedCompleteOnPreview,
  uploadProtectedCompleteOnChunk,
  duplicateCampaign,
  sendEmail,
}
