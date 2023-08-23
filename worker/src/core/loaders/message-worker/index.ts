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
import Govsg from './govsg.class'
import axios from 'axios'

require('module-alias/register') // to resolve aliased paths like @core, @sms, @email

const logger = loggerWithLabel(module)
const client = new TemplateClient({ xssOptions: XSS_EMAIL_OPTION })

let postmanConnection: Sequelize,
  flamingoConnection: Sequelize,
  workerId: string,
  currentCampaignType: string,
  email: Email,
  sms: SMS,
  telegram: Telegram,
  govsg: Govsg
let shouldRun = false

/**
 *  Different channel types operate on their own channel type tables.
 *  Helper method to decide which queries to use, depending on channel type
 */
const service = (): Email | SMS | Telegram | Govsg => {
  switch (currentCampaignType) {
    case 'EMAIL':
      return email
    case 'SMS':
      return sms
    case 'TELEGRAM':
      return telegram
    case 'GOVSG':
      return govsg
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
  return postmanConnection
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

// TODO: refactor the return type
const getMessages = async (
  jobId: number,
  rate: number,
  campaignId: number
): Promise<Message[] | any[]> => {
  return service().getMessages(jobId, rate, campaignId)
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
    // TODO: refactor this away subsequently, the interface is screwed now
    return service().sendMessage(message as any)
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
    const logEmailJob = postmanConnection
      .query('SELECT log_next_job_email();')
      .then(([result]) => get(result, '[0].log_next_job_email', ''))
      .catch((err) => {
        logger.error({
          message: 'Log email job',
          error: err,
          action: 'finalize',
        })
      })

    const logSmsJob = postmanConnection
      .query('SELECT log_next_job_sms();')
      .then(([result]) => get(result, '[0].log_next_job_sms', ''))
      .catch((err) => {
        logger.error({ message: 'Log sms job', error: err, action: 'finalize' })
      })

    const logTelegramJob = postmanConnection
      .query('SELECT log_next_job_telegram();')
      .then(([result]) => get(result, '[0].log_next_job_telegram', ''))
      .catch((err) => {
        logger.error({
          message: 'Log telegram job',
          error: err,
          action: 'finalize',
        })
      })

    const logGovsgJob = postmanConnection
      .query('SELECT log_next_job_govsg();')
      .then(([result]) => get(result, '[0].log_next_job_govsg', ''))
      .then(async (campaignId: number) => {
        const rawMessages = await postmanConnection.query(
          "SELECT * FROM govsg_messages WHERE status = 'ERROR' AND campaign_id = :campaignId",
          { type: QueryTypes.SELECT, replacements: { campaignId } }
        )
        if (!rawMessages) {
          return campaignId
        }

        const messagesWithErr = rawMessages as Array<{
          id: number
          error_code: string
          error_description: string
        }>
        if (
          messagesWithErr.length === 0 ||
          !config.get('sgcCampaignAlertChannelWebhookUrl')
        ) {
          return campaignId
        }
        let text = `*****NEW ALERT******\n*Campaign ${campaignId} has some errors*\n=====\n| Message ID | Error Code | Error Description |\n=====\n`
        messagesWithErr.forEach((m) => {
          text += `| ${m.id} | ${m.error_code} | ${m.error_description} |\n`
        })
        text += '***********'
        await axios
          .post(config.get('sgcCampaignAlertChannelWebhookUrl'), {
            text: text,
          })
          .catch((e) => {
            logger.error({
              message: 'Failed to report errors to #sgc-campaign-alerts',
              error: e,
              action: 'finalize',
            })
          })

        return campaignId
      })
      .catch((err) => {
        logger.error({
          message: 'Log govsg job',
          error: err,
          action: 'finalize',
        })
      })

    return Promise.all([
      logEmailJob,
      logSmsJob,
      logTelegramJob,
      logGovsgJob,
    ]).then((campaignIds) => {
      campaignIds.filter(Boolean).forEach((campaignId) => {
        logger.info({
          message: 'Logging finalized',
          workerId,
          campaignId,
          action: 'finalize',
        })
        // for each campaign id, send email confirmation
        void sendFinalizedNotification(campaignId)
      })
    })
  }
)

const createFlamingoConnection = (): Sequelize => {
  return new Sequelize(config.get('database.flamingoUri'), {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        rejectUnauthorized: false,
      },
    },
    pool: config.get('database.poolOptions'),
  })
}

const createPostmanConnection = (): Sequelize => {
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
      const messages = await getMessages(jobId, rate, campaignId)
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
const sendFinalizedNotification = async (campaignId: number): Promise<void> => {
  const result = await postmanConnection.query(
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

  const jsonRes = get(result, '[0].result') || {}
  const {
    campaign_name: campaignName,
    created_at: createdAt,
    unsent_count: unsentCount,
    error_count: errorCount,
    sent_count: sentCount,
    invalid_count: invalidCount,
    notification_email: notificationEmail,
    halted: halted,
  } = jsonRes

  let mail: MailToSend | undefined
  // craft and send mail here
  // if halted, send halted notif
  if (halted) {
    mail = await NotificationService.generateHaltedCampaignNotificationEmail(
      client,
      notificationEmail,
      campaignName
    )
  } else {
    // for scheduled, visible_at must be after created_at
    // normal flow, pull out visibleAt from job_queue table.
    const result = await postmanConnection.query(
      "select visible_at from job_queue where campaign_id=:campaign_id_input and status = 'LOGGED' order by created_at desc limit 1;",
      {
        replacements: { campaign_id_input: campaignId },
        type: QueryTypes.SELECT,
      }
    )
    const visibleAt = get(result, '[0].visible_at')
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
  if (mail !== undefined) {
    // Send email using node mailer
    // cannot use singleton mailclient like backend cuz worker will self destruct
    // instantiate it only when needed
    const mailClient = new MailClient(
      config.get('mailOptions'),
      config.get('mailOptions.callbackHashSecret'),
      config.get('mailFrom'),
      config.get('mailConfigurationSet')
    )
    const isEmailSent = await NotificationService.sendEmail(mailClient, mail)
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

/**
 * When a worker is spawned, it adds itself to the database,
 * and checks if it was working on any existing jobs
 */
const createAndResumeWorker = (): Promise<void> => {
  return assignment(postmanConnection, workerId)
    .then(() => {
      return postmanConnection.query('SELECT resume_worker(:worker_id);', {
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
  postmanConnection = createPostmanConnection()
  flamingoConnection = createFlamingoConnection()
  email = new Email(workerId, postmanConnection)
  sms = new SMS(workerId, postmanConnection)
  telegram = new Telegram(workerId, postmanConnection)
  govsg = new Govsg(workerId, postmanConnection, flamingoConnection)

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
    if (postmanConnection) {
      logger.info({
        message: 'Closing postman database connection',
        action: 'start',
        workerId,
      })
      await postmanConnection.close()
    }
    if (flamingoConnection) {
      logger.info({
        message: 'Closing flamingo database connection',
        action: 'start',
        workerId,
      })
      await flamingoConnection.close()
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
