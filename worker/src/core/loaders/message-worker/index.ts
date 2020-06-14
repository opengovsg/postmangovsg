import { expose } from 'threads/worker'
import { Sequelize } from 'sequelize-typescript'
import { QueryTypes } from 'sequelize'
import get from 'lodash/get'
require('module-alias/register') // to resolve aliased paths like @core, @sms, @email
import config from '@core/config'
import logger from '@core/logger'
import Email from './email.class'
import SMS from './sms.class'
import ECSUtil from './util/ecs'
import assignment from './util/assignment'
let connection: Sequelize,
  workerId: string,
  currentCampaignType: string,
  email: Email,
  sms: SMS

/**
 *  Different channel types operate on their own channel type tables.
 *  Helper method to decide which queries to use, depending on channel type
 */
const service = (): Email | SMS => {
  switch (currentCampaignType) {
    case 'EMAIL':
      return email
    case 'SMS':
      return sms
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
        logger.info(
          `${workerId}:  get_next_job job_id=${jobId} campaign_id=${campaignId} campaign_type=${campaignType} cred_name=${credName}`
        )
      return { jobId, campaignId, campaignType, rate, credName }
    })
}

const enqueueMessages = (jobId: number, campaignId: number): Promise<void> => {
  return service().enqueueMessages(jobId, campaignId)
}

const getMessages = (
  jobId: number,
  rate: number
): Promise<
  {
    id: number
    recipient: string
    params: { [key: string]: string }
    body: string
    subject?: string
    replyTo?: string | null
    campaignId?: number
  }[]
> => {
  return service().getMessages(jobId, rate)
}

const sendMessage = (message: {
  id: number
  recipient: string
  params: { [key: string]: string }
  body: string
  subject?: string
  replyTo?: string | null
  campaignId?: number
}): Promise<void> => {
  return service().sendMessage(message)
}

const finalize = (): Promise<void> => {
  const logEmailJob = connection
    .query('SELECT log_next_job_email();')
    .then(([result]) => get(result, '[0].log_next_job_email', ''))
    .catch((err) => {
      logger.error(err)
    })

  const logSmsJob = connection
    .query('SELECT log_next_job_sms();')
    .then(([result]) => get(result, '[0].log_next_job_sms', ''))
    .catch((err) => {
      logger.error(err)
    })

  return Promise.all([logEmailJob, logSmsJob]).then((campaignIds) => {
    campaignIds.filter(Boolean).forEach((campaignId) => {
      logger.info(`${workerId}: finalized campaignId=${campaignId}`)
    })
  })
}

const createConnection = (): Sequelize => {
  const dialectOptions = config.get('IS_PROD')
    ? config.get('database.dialectOptions')
    : {}
  return new Sequelize(config.get('database.databaseUri'), {
    dialect: 'postgres',
    logging: false,
    pool: config.get('database.poolOptions'),
    dialectOptions,
  })
}

const waitForMs = (ms: number): Promise<void> => {
  if (ms > 0) return new Promise((resolve) => setTimeout(() => resolve(), ms))
  return Promise.resolve()
}

const enqueueAndSend = async (): Promise<void> => {
  const { jobId, rate, credName, campaignId } = await getNextJob()
  if (jobId && rate && credName && campaignId) {
    await service().setSendingService(credName)
    await enqueueMessages(jobId, campaignId)
    let hasNext = true
    while (hasNext) {
      const messages = await getMessages(jobId, rate)
      if (!messages[0]) {
        hasNext = false
      } else {
        const start = Date.now()
        await Promise.all(messages.map((m) => sendMessage(m)))
        // Make sure at least 1 second has elapsed
        const wait = Math.max(0, 1000 - (Date.now() - start))
        await waitForMs(wait)
        logger.info(
          `${workerId}: jobId=${jobId} rate=${rate} numMessages=${messages.length} wait=${wait}`
        )
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
      logger.info(`${workerId}: Resumed`)
    })
}

const init = async (index: string, isLogger = false): Promise<any> => {
  await ECSUtil.load()
  workerId = ECSUtil.getWorkerId(index)
  connection = createConnection()
  email = new Email(workerId, connection)
  sms = new SMS(workerId, connection)
  try {
    if (!isLogger) {
      await createAndResumeWorker()
      for (;;) {
        await enqueueAndSend()
        await waitForMs(2000)
      }
    } else {
      for (;;) {
        await finalize()
        await waitForMs(2000)
      }
    }
  } catch (err) {
    return Promise.reject(err)
  }
}

const messageWorker = {
  init,
}

expose(messageWorker)

export type MessageWorker = typeof messageWorker
export default MessageWorker
