import { TemplateClient, XSS_EMAIL_OPTION } from '@shared/templating'
import { NotificationService } from '@core/services/notification.service'
import config from '@core/config'
import MailClient from '@shared/clients/mail-client.class'

let templateClient: TemplateClient
let mailClient: MailClient

beforeAll(async () => {
  templateClient = new TemplateClient({ xssOptions: XSS_EMAIL_OPTION })
  mailClient = new MailClient(
    config.get('mailOptions'),
    config.get('mailOptions.callbackHashSecret'),
    config.get('mailFrom'),
    config.get('mailConfigurationSet')
  )
})
describe('notification', () => {
  test('test basic content formation of notification service', async () => {
    const copyConfig = config
    expect(copyConfig.has('mailOptions')).toBeTruthy()
    // init a client
    const notificationEmail = 'richardyak@open.gov.sg'
    const campaignName = 'Test campaign from jest'
    const unsentCount = 10
    const errorCount = 5
    const sentCount = 10
    const invalidCount = 5
    const mailToSend =
      await NotificationService.generateScheduledCampaignNotificationEmail(
        templateClient,
        notificationEmail,
        campaignName,
        unsentCount,
        errorCount,
        sentCount,
        invalidCount
      )
    if (mailToSend) {
      expect(mailToSend.recipients.length).toEqual(1)
      expect(mailToSend.recipients[0]).toEqual('richardyak@open.gov.sg')

      // this actually sends out a mail to your mailbox!
      // finally, you can trigger mails on local to test your content!!
      const mailRes = await NotificationService.sendEmail(
        mailClient,
        mailToSend
      )
      expect(mailRes).not.toBeNull()
    }
  })
})
