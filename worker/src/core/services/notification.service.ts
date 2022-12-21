import MailClient, {
  MailToSend,
  SendEmailOpts,
} from '@shared/clients/mail-client.class'
import config from '@core/config'
import { loggerWithLabel } from '@core/logger'
import { ThemeClient } from '@shared/theme'
import { TemplateClient } from '@shared/templating'

const logger = loggerWithLabel(module)

const sendEmail = async (
  mailClient: MailClient,
  mail: MailToSend,
  opts?: SendEmailOpts
): Promise<string | void> => {
  try {
    return mailClient.sendMail(mail, opts)
  } catch (e) {
    logger.error({
      message: 'Error while sending test email',
      error: e,
      action: 'sendEmail',
    })
    return
  }
}

const generateScheduledCampaignNotificationEmail = async (
  client: TemplateClient,
  recipient: string,
  campaignName: string,
  unsentCount: number,
  errorCount: number,
  sentCount: number,
  invalidCount: number
): Promise<MailToSend | void> => {
  const subject =
    'Your scheduled campaign "' + campaignName + '" was successfully sent out'
  // hardcode the email body for notification
  const totalCount = unsentCount + errorCount + sentCount + invalidCount
  // manually build the params set
  const params: { [key: string]: string } = {
    recipient: recipient,
    campaignName: campaignName,
    totalCount: totalCount.toString(),
    unsentCount: unsentCount.toString(),
    errorCount: errorCount.toString(),
    sentCount: sentCount.toString(),
    invalidCount: invalidCount.toString(),
  }
  const templateBody =
    '<p>Greetings,</p>' +
    '<p>Your scheduled campaign <b>{{campaignName}}</b> has been sent!</p>' +
    '<p>You may log in to Postman.gov.sg to view your campaign statistics and download your delivery report.</p>' +
    '<p>Thank you,</p>' +
    '<p>Postman.gov.sg</p>'
  const body = client.template(templateBody as string, params)
  return assembleNotificationMail(recipient, subject, body)
}

const generateHaltedCampaignNotificationEmail = async (
  client: TemplateClient,
  recipient: string,
  campaignName: string
): Promise<MailToSend | void> => {
  const params: { [key: string]: string } = {
    recipient: recipient,
    campaignName: campaignName,
  }
  const subject = 'Your scheduled campaign "' + campaignName + '" was not sent.'
  const templateBody =
    '<p>Greetings,</p>' +
    '<p>Your scheduled campaign <b>{{campaignTitle}}</b> was not sent because it was halted. This is likely due to the high number bounces caused by the invalid emails. </p>' +
    '<p>Please reply to this email so that we can resolve it for you</p>' +
    '<p>Thank you,</p>' +
    '<p>Postman.gov.sg</p>'
  const body = client.template(templateBody as string, params)
  return assembleNotificationMail(recipient, subject, body)
}

const assembleNotificationMail = async (
  recipient: string,
  subject: string,
  body: string
): Promise<MailToSend> => {
  return {
    from: config.get('mailFrom'),
    recipients: [recipient],
    body: await ThemeClient.generateThemedHTMLEmail({
      unsubLink: '',
      body,
      showMasthead: true,
    }),
    subject,
    ...(config.get('mailFrom') ? { replyTo: config.get('mailFrom') } : {}),
  }
}

export const NotificationService = {
  sendEmail,
  // eventually to move to a theme folder for all relevant transactional maielrs
  generateScheduledCampaignNotificationEmail,
  generateHaltedCampaignNotificationEmail,
}
