import tracer from 'dd-trace'
import { Sequelize } from 'sequelize-typescript'
import { QueryTypes } from 'sequelize'
import get from 'lodash/get'
require('module-alias/register') // to resolve aliased paths like @core, @sms, @email
import config from '@core/config'
import { loggerWithLabel } from '@core/logger'
import { MutableConfig, generateRdsIamAuthToken } from '@core/utils/rds-iam'
import { millisecondsToMinSecString, waitForMs } from '@shared/utils/time'
import Email from './email.class'
import SMS from './sms.class'
import Telegram from './telegram.class'
import ECSUtil from './util/ecs'
import assignment from './util/assignment'
import { Message } from './interface'

const logger = loggerWithLabel(module)
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
  {
    tags: {
      'resource.name': 'sendMessage',
    },
  },
  (message: Message): Promise<void> => {
    logger.info({
      message: 'Start sending message',
      messageValue: message,
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
        await Promise.all(messages.map((m) => sendMessage(m)))
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
        const whileLoopTimeTakenMs = Date.now() - start
        const numMessages = messages.length
        const numMessagesPerSecond = (numMessages / whileLoopTimeTakenMs) * 1000
        logger.info({
          message: `Logging sending while loop duration: ${millisecondsToMinSecString(
            whileLoopTimeTakenMs
          )}`,
          action: 'enqueueAndSend',
          numMessagesPerSecond,
          numMessages,
          currentCampaignType,
          campaignId,
          workerId,
          jobId,
        })
      }
    }
    await service().destroySendingService()
  }
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
