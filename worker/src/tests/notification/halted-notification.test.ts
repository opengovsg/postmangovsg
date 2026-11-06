import { TemplateClient, XSS_EMAIL_OPTION } from '@shared/templating'
import { NotificationService } from '@core/services/notification.service'

test('halted campaign notification names the campaign in the body', async () => {
  const mail =
    await NotificationService.generateHaltedCampaignNotificationEmail(
      new TemplateClient({ xssOptions: XSS_EMAIL_OPTION }),
      'user@agency.gov.sg',
      'Sample campaign'
    )
  expect(mail.body).toContain('<b>Sample campaign</b>')
})
