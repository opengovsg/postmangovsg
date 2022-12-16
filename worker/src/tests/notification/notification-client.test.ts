import { TemplateClient, XSS_EMAIL_OPTION } from '@shared/templating'
import { NotificationService } from '@core/services/notification.service'
import config from '@core/config'
import MailClient, { MailToSend } from '@shared/clients/mail-client.class'
import { Sequelize } from 'sequelize-typescript'
import { QueryTypes } from 'sequelize'
import get from 'lodash/get'

let templateClient: TemplateClient
let mailClient: MailClient
let connection: Sequelize

beforeAll(async () => {
  templateClient = new TemplateClient({ xssOptions: XSS_EMAIL_OPTION })
  mailClient = new MailClient(
    config.get('mailOptions'),
    config.get('mailOptions.callbackHashSecret'),
    config.get('mailFrom'),
    config.get('mailConfigurationSet')
  )
  const dialectOptions =
    config.get('env') !== 'JEST' ? config.get('database.dialectOptions') : {}
  connection = new Sequelize(config.get('database.databaseUri'), {
    dialect: 'postgres',
    logging: false,
    pool: config.get('database.poolOptions'),
    dialectOptions,
    retry: {
      max: 5,
      match: [
        /ConnectionError/,
        /SequelizeConnectionError/,
        /SequelizeConnectionRefusedError/,
        /SequelizeHostNotFoundError/,
        /SequelizeHostNotReachableError/,
        /SequelizeInvalidConnectionError/,
        /SequelizeConnectionTimedOutError/,
        /SequelizeConnectionAcquireTimeoutError/,
        /Connection terminated unexpectedly/,
      ],
    },
  })
})
describe('notification', () => {
  test('test basic content formation of notification service', async () => {
    const copyConfig = config
    expect(copyConfig.has('mailOptions')).toBeTruthy()
    // mock a campaign
    void connection
      .query(
        "SELECT json_build_object('id', c.id," +
          "'campaign_name', c.name," +
          "'created_at', c.created_at," +
          "'unsent_count', s.unsent," +
          "'error_count', s.errored," +
          "'sent_count', s.sent," +
          "'invalid_count', s.invalid," +
          "'notification_email', u.email," +
          "'halted', c.halted) as result FROM campaigns c INNER JOIN statistics s ON c.id=s.campaign_id INNER JOIN users u ON c.user_id=u.id WHERE c.id=:campaign_id_input;",
        {
          replacements: { campaign_id_input: 12 },
          type: QueryTypes.SELECT,
        }
      )
      .then(async (result) => {
        const jsonRes = get(result, '[0].result') || {}
        const {
          id: campaignId,
          campaign_name: campaignName,
          created_at: createdAt,
          unsent_count: unsentCount,
          error_count: errorCount,
          sent_count: sentCount,
          invalid_count: invalidCount,
          notification_email: notificationEmail,
          halted: halted,
        } = jsonRes
        if (campaignId) {
          // craft and send mail here
          // for scheduled, visible_at must be after created_at
          let mail: MailToSend | void
          if (campaignId) {
            // craft and send mail here
            // if halted, send halted notif
            if (halted) {
              mail =
                await NotificationService.generateHaltedCampaignNotificationEmail(
                  templateClient,
                  notificationEmail,
                  campaignName
                )
            } else {
              // for scheduled, visible_at must be after created_at
              const visibleAt = await connection
                .query(
                  "select visible_at from job_queue where campaign_id=:campaign_id_input and status = 'LOGGED' order by created_at desc limit 1;",
                  {
                    replacements: { campaign_id_input: campaignId },
                    type: QueryTypes.SELECT,
                  }
                )
                .then(async (result) => {
                  return get(result, '[0].visible_at')
                })
              if (new Date(createdAt) < visibleAt) {
                mail =
                  await NotificationService.generateScheduledCampaignNotificationEmail(
                    templateClient,
                    notificationEmail,
                    campaignName,
                    unsentCount,
                    errorCount,
                    sentCount,
                    invalidCount
                  )
              }
            }
            if (mail) {
              // Send email using node mailer
              const mailClient = new MailClient(
                config.get('mailOptions'),
                config.get('mailOptions.callbackHashSecret'),
                config.get('mailFrom'),
                config.get('mailConfigurationSet')
              )
              const isEmailSent = await NotificationService.sendEmail(
                mailClient,
                mail
              )
              expect(isEmailSent).toBeTruthy()
            }
          }
        }
      }) // init a client
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
