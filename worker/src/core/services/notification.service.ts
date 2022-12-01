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
  const subject = 'Your scheduled campaign has been successfully sent!'
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
    '<p>Hey {{recipient}}, your scheduled campaign {{campaignName}} has been sent!</p>' +
    '<p>Out of {{totalCount}} messages, {{sentCount}} messages were successfully sent and {{unsentCount}} were unsent </p>' +
    '<p>This campaign had {{invalidCount}} invalid recipients, and met with {{errorCount}} errors.</p>'
  const body = client.template(templateBody as string, params)
  const mailToSend: MailToSend = {
    from: config.get('mailFrom'),
    recipients: [recipient],
    body: await ThemeClient.generateThemedHTMLEmail({
      unsubLink: '',
      body,
    }),
    subject,
    ...(config.get('mailFrom') ? { replyTo: config.get('mailFrom') } : {}),
  }
  return mailToSend
}

export const NotificationService = {
  sendEmail,
  generateScheduledCampaignNotificationEmail,
}
