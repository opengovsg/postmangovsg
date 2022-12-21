import tracer from 'dd-trace'
import { Sequelize } from 'sequelize-typescript'
import { QueryTypes } from 'sequelize'
import get from 'lodash/get'
import config from '@core/config'
import { loggerWithLabel } from '@core/logger'
import { generateRdsIamAuthToken, MutableConfig } from '@core/utils/rds-iam'
import { waitForMs } from '@shared/utils/wait-for-ms'
import Email from './email.class'
import SMS from './sms.class'
import Telegram from './telegram.class'
import ECSUtil from './util/ecs'
import assignment from './util/assignment'
import { Message } from './interface'
import { NotificationService } from '@core/services/notification.service'
import { TemplateClient, XSS_EMAIL_OPTION } from '@shared/templating'
import MailClient, { MailToSend } from '@shared/clients/mail-client.class'

require('module-alias/register') // to resolve aliased paths like @core, @sms, @email

const logger = loggerWithLabel(module)
const client = new TemplateClient({ xssOptions: XSS_EMAIL_OPTION })

let connection: Sequelize,
  workerId: string,
  currentCampaignType: string,
  email: Email,
  sms: SMS,
  telegram: Telegram
let shouldRun = false

/**
 *  Different channel types operate on their own channel type tables.
 *  Helper method to decide which queries to use, depending on channel type
 */
const service = (): Email | SMS | Telegram => {
  switch (currentCampaignType) {
    case 'EMAIL':
      return email
    case 'SMS':
      return sms
    case 'TELEGRAM':
      return telegram
    default:
      throw new Error(`${currentCampaignType} not supported`)
  }
}

const getNextJob = (): Promise<{
  jobId: number | undefined
  campaignId: number | undefined
  campaignType: string | undefined
  rate: number | undefined
  credName: string | undefined
}> => {
  return connection
    .query('SELECT get_next_job(:worker_id);', {
      replacements: { worker_id: workerId },
      type: QueryTypes.SELECT,
    })
    .then((result) => {
      const nextJob = get(result, '[0].get_next_job') || {}
      const {
        job_id: jobId,
        campaign_id: campaignId,
        type: campaignType,
        rate,
        cred_name: credName,
      } = nextJob
      currentCampaignType = campaignType
      if (jobId)
        logger.info({
          message: 'Get next job',
          workerId,
          jobId,
          campaignId,
          campaignType,
          credName,
          action: 'getNextJob',
        })
      return { jobId, campaignId, campaignType, rate, credName }
    })
}

const enqueueMessages = (jobId: number, campaignId: number): Promise<void> => {
  return service().enqueueMessages(jobId, campaignId)
}

const getMessages = async (jobId: number, rate: number): Promise<Message[]> => {
  return await service().getMessages(jobId, rate)
}

const sendMessage = tracer.wrap(
  'message-worker',
  (
    message: Message,
    metadata: {
      campaignType: string
      campaignId: number
      workerId: string
      jobId: number
    }
  ): Promise<void> => {
    const span = tracer.scope().active()
    span?.addTags({
      'resource.name': `send_message_${metadata.campaignType.toLowerCase()}`,
      campaign_type: metadata.campaignType.toLowerCase(),
      campaign_id: metadata.campaignId,
      worker_id: metadata.workerId,
      job_id: metadata.jobId,
    })
    logger.info({
      message: 'Start sending message',
      messageValue: message,
      ...metadata,
    })
    return service().sendMessage(message)
  }
)

const finalize = tracer.wrap(
  'message-worker',
  {
    tags: {
      'resource.name': 'finalize',
    },
  },
  (): Promise<void> => {
    const logEmailJob = connection
      .query('SELECT log_next_job_email();')
      .then(([result]) => get(result, '[0].log_next_job_email', ''))
      .catch((err) => {
        logger.error({
          message: 'Log email job',
          error: err,
          action: 'finalize',
        })
      })

    const logSmsJob = connection
      .query('SELECT log_next_job_sms();')
      .then(([result]) => get(result, '[0].log_next_job_sms', ''))
      .catch((err) => {
        logger.error({ message: 'Log sms job', error: err, action: 'finalize' })
      })

    const logTelegramJob = connection
      .query('SELECT log_next_job_telegram();')
      .then(([result]) => get(result, '[0].log_next_job_telegram', ''))
      .catch((err) => {
        logger.error({
          message: 'Log telegram job',
          error: err,
          action: 'finalize',
        })
      })

    return Promise.all([logEmailJob, logSmsJob, logTelegramJob]).then(
      (campaignIds) => {
        campaignIds.filter(Boolean).forEach((campaignId) => {
          logger.info({
            message: 'Logging finalized',
            workerId,
            campaignId,
            action: 'finalize',
          })
          // for each campaign id, send email confirmation
          sendFinalizedNotification(campaignId)
        })
      }
    )
  }
)

const createConnection = (): Sequelize => {
  const dialectOptions =
    config.get('env') !== 'development'
      ? config.get('database.dialectOptions')
      : {}
  return new Sequelize(config.get('database.databaseUri'), {
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
    hooks: {
      beforeConnect: async (dbConfig: MutableConfig): Promise<void> => {
        if (config.get('database.useIam')) {
          dbConfig.password = await generateRdsIamAuthToken(dbConfig)
        }
      },
    },
  })
}

const enqueueAndSend = async (): Promise<void> => {
  const { jobId, rate, credName, campaignId } = await getNextJob()
  if (jobId && rate && credName && campaignId) {
    await service().setSendingService(credName)
    await enqueueMessages(jobId, campaignId)

    let hasNext = true
    while (hasNext && shouldRun) {
      const messages = await getMessages(jobId, rate)
      if (!messages[0]) {
        hasNext = false
      } else {
        logger.info({
          message: 'Sending messages',
          workerId,
          jobId,
          rate,
          numMessages: messages.length,
          action: 'enqueueAndSend',
        })

        const start = Date.now()
        await Promise.all(
          messages.map((m) =>
            sendMessage(m, {
              campaignType: currentCampaignType,
              campaignId,
              workerId,
              jobId,
            })
          )
        )
        // Make sure at least 1 second has elapsed
        const wait = Math.max(0, 1000 - (Date.now() - start))
        await waitForMs(wait)

        if (!shouldRun) {
          logger.info({
            message: 'Stopping send early due to worker shutdown',
            action: 'enqueueAndSend',
            workerId,
            jobId,
          })
        }
      }
    }
    await service().destroySendingService()
  }
}

// to refactor to use orm
const sendFinalizedNotification = (campaignId: number): void => {
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
        replacements: { campaign_id_input: campaignId },
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

      let mail: MailToSend | void
      if (campaignId) {
        // craft and send mail here
        // if halted, send halted notif
        if (halted) {
          mail =
            await NotificationService.generateHaltedCampaignNotificationEmail(
              client,
              notificationEmail,
              campaignName
            )
        } else {
          // for scheduled, visible_at must be after created_at
          // normal flow, pull out visibleAt from job_queue table.

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
                client,
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
          // cannot use singleton mailclient like backend cuz worker will self destruct
          // instantiate it only when needed
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
          if (isEmailSent) {
            logger.info({
              message: 'Notification email successfully sent',
              campaignId,
              createdAt,
              unsentCount,
              errorCount,
              sentCount,
              invalidCount,
              notificationEmail,
              halted,
              action: 'sendFinalizedNotification',
            })
          }
        }
      }
    })
  return
}

/**
 * When a worker is spawned, it adds itself to the database,
 * and checks if it was working on any existing jobs
 */
const createAndResumeWorker = (): Promise<void> => {
  return assignment(connection, workerId)
    .then(() => {
      return connection.query('SELECT resume_worker(:worker_id);', {
        replacements: { worker_id: workerId },
        type: QueryTypes.SELECT,
      })
    })
    .then(() => {
      logger.info({
        message: 'Resumed worker',
        workerId,
        action: 'createAndResumeWorker',
      })
    })
}

const start = async (index: string, isLogger = false): Promise<any> => {
  await ECSUtil.load()
  workerId = ECSUtil.getWorkerId(index)
  connection = createConnection()
  email = new Email(workerId, connection)
  sms = new SMS(workerId, connection)
  telegram = new Telegram(workerId, connection)

  try {
    shouldRun = true

    if (!isLogger) {
      await createAndResumeWorker()
      while (shouldRun) {
        await enqueueAndSend()
        await waitForMs(2000)
      }
    } else {
      while (shouldRun) {
        await finalize()
        await waitForMs(2000)
      }
    }
  } catch (err) {
    return Promise.reject(err)
  } finally {
    if (connection) {
      logger.info({
        message: 'Closing database connection',
        action: 'start',
        workerId,
      })
      await connection.close()
    }
  }
}

const shutdown = (): void => {
  logger.info({
    message: 'Shutdown signal recieved. Attempting to gracefully shutdown.',
    action: 'shutdown',
    workerId,
  })
  shouldRun = false
}

const worker = {
  start,
  shutdown,
}
export default worker
