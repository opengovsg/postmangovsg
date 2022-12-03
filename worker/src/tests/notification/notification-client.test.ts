import { TemplateClient, XSS_EMAIL_OPTION } from '@shared/templating'
import { NotificationService } from '@core/services/notification.service'
import config from '@core/config'
import MailClient from '@shared/clients/mail-client.class'

let templateClient: TemplateClient
let mailClient: MailClient
// let connection: Sequelize

beforeAll(async () => {
  templateClient = new TemplateClient({ xssOptions: XSS_EMAIL_OPTION })
  mailClient = new MailClient(
    config.get('mailOptions'),
    config.get('mailOptions.callbackHashSecret'),
    config.get('mailFrom'),
    config.get('mailConfigurationSet')
  )
  // const dialectOptions =
  //   config.get('env') !== 'JEST' ? config.get('database.dialectOptions') : {}
  // connection = new Sequelize(config.get('database.databaseUri'), {
  //   dialect: 'postgres',
  //   logging: false,
  //   pool: config.get('database.poolOptions'),
  //   dialectOptions,
  //   retry: {
  //     max: 5,
  //     match: [
  //       /ConnectionError/,
  //       /SequelizeConnectionError/,
  //       /SequelizeConnectionRefusedError/,
  //       /SequelizeHostNotFoundError/,
  //       /SequelizeHostNotReachableError/,
  //       /SequelizeInvalidConnectionError/,
  //       /SequelizeConnectionTimedOutError/,
  //       /SequelizeConnectionAcquireTimeoutError/,
  //       /Connection terminated unexpectedly/,
  //     ],
  //   },
  // })
})
describe('notification', () => {
  test('test basic content formation of notification service', async () => {
    const copyConfig = config
    expect(copyConfig.has('mailOptions')).toBeTruthy()
    // mock a campaign
    // await connection
    //   .query('SELECT get_notification_data_by_campaign_id(:campaign_id)', {
    //     replacements: { campaign_id: 13 },
    //     type: QueryTypes.SELECT,
    //   })
    //   .then(async (result) => {
    //     const jsonRes =
    //       get(result, '[0].get_notification_data_by_campaign_id') || {}
    //     const {
    //       id: campaignId,
    //       campaign_name: campaignName,
    //       visible_at: visibleAt,
    //       created_at: createdAt,
    //       unsent_count: unsentCount,
    //       error_count: errorCount,
    //       sent_count: sentCount,
    //       invalid_count: invalidCount,
    //       notification_email: notificationEmail,
    //     } = jsonRes
    //     if (campaignId) {
    //       // craft and send mail here
    //       // for scheduled, visible_at must be after created_at
    //       if (new Date(createdAt) < new Date(visibleAt)) {
    //         const mail =
    //           await NotificationService.generateScheduledCampaignNotificationEmail(
    //             templateClient,
    //             notificationEmail,
    //             campaignName,
    //             unsentCount,
    //             errorCount,
    //             sentCount,
    //             invalidCount
    //           )
    //         if (!mail) {
    //           throw new Error('No message to send')
    //         }
    //         // Send email using node mailer
    //         const isEmailSent = await NotificationService.sendEmail(
    //           mailClient,
    //           mail
    //         )
    //         expect(isEmailSent).toBeTruthy()
    //       }
    //     }
    //   }) // init a client
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
