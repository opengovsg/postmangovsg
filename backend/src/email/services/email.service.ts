import { Transaction } from 'sequelize'
import logger from '@core/logger'
import dns from 'dns'
import AWS from 'aws-sdk'
import { CSVParams } from '@core/types'

import { ChannelType } from '@core/constants'
import { Campaign, ProtectedMessage, User } from '@core/models'
import {
  MailService,
  CampaignService,
  UploadService,
  ProtectedService,
  UnsubscriberService,
} from '@core/services'
import { MailToSend, CampaignDetails } from '@core/interfaces'

import { EmailTemplate, EmailMessage, VerifiedEmail } from '@email/models'
import { EmailTemplateService } from '@email/services'

const ses = new AWS.SES({ region: 'eu-central-1' })

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
  return {
    body,
    subject,
    replyTo: template.replyTo || null,
    from: template?.from!,
  }
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
    const { body, subject, replyTo, from } = message
    const mailToSend: MailToSend = {
      from,
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
      const { recipient } = entry
      return {
        campaignId,
        recipient: recipient.trim().toLowerCase(),
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

/**
 * Verifies if the cname records are in the email's domain dns
 * @throws Error if verification fails
 */
// SWTODO: move to a separate service. Not sure about the service name yet
const verifyCnames = async (
  tokens: Array<string>,
  email: string
): Promise<void> => {
  // get email domain
  const domain = email.slice(email.lastIndexOf('@') + 1)
  const cnames = tokens.map((token) => `${token}._domainkey.${domain}`)
  try {
    for (const cname of cnames) {
      await dns.promises.resolve(cname, 'CNAME')
    }
  } catch (e) {
    throw new Error(`Verification of dkim records failed for ${email}`)
  }
}

/**
 * Verifies if the cname records are in the email's domain dns
 * @throws Error if the domain's dns do not have the cname records
 */
const verifyEmailWithAWS = async (email: string): Promise<Array<string>> => {
  // Get the dkim attributes for the email address
  const params = {
    Identities: [email],
  }
  const { DkimAttributes } = await ses
    .getIdentityDkimAttributes(params)
    .promise()
  if (DkimAttributes[email]?.DkimVerificationStatus! !== 'Success') {
    throw new Error(`Email address not verified by AWS SES. email=${email}`)
  }
  return DkimAttributes[email]?.DkimTokens!
}

/**
 * Verifies if the email provided matches the user's
 * @throws Error if the emails doesn't match
 */
const verifyEmail = async (email: string, userId: number): Promise<void> => {
  // Verify email address that is provided
  const user = await User.findOne({ where: { id: userId } })
  if (user === null) throw new Error(`Failed to find user id: ${userId}`)

  if (user.email !== email) {
    throw new Error(
      `From email address not allowed. User's email: ${user.email}, given: ${email} `
    )
  }
}

/**
 * Verifies the from email address in different ways:
 * 1. Against the user's email address
 * 2. With AWS to ensure that we can use the email address to send
 * 3. Checks the domain's dns to ensure that the cnames are there
 * @throws Error if any of the verification fails
 */
const verifyFromEmailAddress = async (
  email: string,
  userId: number
): Promise<void> => {
  await verifyEmail(email, userId)
  const DkimTokens = await verifyEmailWithAWS(email)
  await verifyCnames(DkimTokens, email)
}

/**
 * Stores the provided email address in verified_email table
 * @throws Error if it fails to store the email address.
 */
const storeVerifiedEmail = async (email: string): Promise<void> => {
  try {
    await VerifiedEmail.findOrCreate({
      where: {
        email,
      },
    })
  } catch (e) {
    throw new Error(`Failed to store verified email for ${email}`)
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
  verifyFromEmailAddress,
  storeVerifiedEmail,
}
