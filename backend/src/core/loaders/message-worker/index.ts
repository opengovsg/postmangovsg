
import { expose } from 'threads/worker'
import { Sequelize } from 'sequelize-typescript'
import { QueryTypes } from 'sequelize'
import get from 'lodash/get'
require('module-alias/register') // to resolve aliased paths like @core, @sms, @email
import config from '@core/config'
import logger from '@core/logger'
import Email from './email.class'
import SMS from './sms.class'

let connection: Sequelize, 
  workerId: number, 
  currentCampaignType: string,
  email: Email,
  sms: SMS

/**
 *  Different channel types operate on their own channel type tables.
 *  Helper method to decide which queries to use, depending on channel type
 */
const service = (): Email | SMS => {
  switch(currentCampaignType){
  case 'EMAIL':
    return email
  case 'SMS':
    return sms
  default:
    throw new Error(`${currentCampaignType} not supported`)
  }
}

const getNextJob = (): Promise< { jobId: number | undefined; campaignId: number | undefined; campaignType: string | undefined; rate: number | undefined}>  => {
  return connection.query('SELECT get_next_job(:worker_id);',
    { replacements: { 'worker_id': workerId }, type: QueryTypes.SELECT },
  ).then((result) => {
    const nextJob = get(result, '[0].get_next_job') || {}
    const { 'job_id': jobId, 'campaign_id': campaignId, 'type': campaignType, rate } = nextJob
    currentCampaignType = campaignType
    if(jobId) logger.info(`${workerId}:  get_next_job job_id=${jobId} campaign_id=${campaignId} campaign_type=${campaignType}`)
    return { jobId, campaignId, campaignType, rate }
  })
}

const enqueueMessages = (jobId: number): Promise<void> => {
  return service().enqueueMessages(jobId)
}
  
const getMessages = (jobId: number, rate: number): Promise<{id: number; recipient: string; params: {[key: string]: string}; body: string; subject?: string}[]>  => {
  return service().getMessages(jobId, rate)
}

const sendMessage = (message: { id: number; recipient: string; params: {[key: string]: string}; body: string; subject?: string}): Promise<void>  => {
  return service().sendMessage(message)
}
  
const finalize = (): Promise<void> => {
  return connection.query('SELECT log_next_job();',
  ).then(([result]) => {
    const campaignId = get(result, ('[0].log_next_job'), '')
    if (campaignId) logger.info(`${workerId}: finalized campaignId=${campaignId}`)
  })
}

const createConnection = (): Sequelize => {
  const dialectOptions = config.IS_PROD ? { ...config.database.dialectOptions } : {}
  return new Sequelize(config.database.databaseUri, {
    dialect: 'postgres',
    logging: false,
    pool: config.database.poolOptions,
    ...dialectOptions,
  })
}
  
const waitForMs = (ms: number): Promise<void> => {
  if (ms > 0) return new Promise(resolve => setTimeout(() => resolve(), ms))
  return Promise.resolve()
}
  
    
const enqueueAndSend = async (): Promise<void>  => {
  const { jobId, rate } = await getNextJob()
  if (jobId && rate) {
    await enqueueMessages(jobId)
    let hasNext = true
    while (hasNext) {
      const messages = await getMessages(jobId, rate)
      if (!messages[0]) {
        hasNext = false
      } else {
        const start = Date.now()
        await Promise.all(messages.map(m => sendMessage(m)))
        // Make sure at least 1 second has elapsed
        const wait = Math.max(0, 1000 - (Date.now() - start))
        await waitForMs(wait)
      }
    }
  }
}

/**
 * When a worker is spawned, it adds itself to the database, 
 * and checks if it was working on any existing jobs
 */
const createAndResumeWorker = (): Promise<void> => {
  return connection.query(`
            INSERT INTO workers ("id",  "created_at", "updated_at") VALUES 
            (:worker_id, clock_timestamp(), clock_timestamp()) ON CONFLICT (id) DO NOTHING;
    
            SELECT resume_worker(:worker_id);
        `,
  { replacements: { 'worker_id': workerId }, type: QueryTypes.INSERT },
  ).then(() => {
    logger.info(`${workerId}: Resumed`)
  })
}

  
const init = async (index: number, isLogger = false): Promise<void> => {
  workerId = index
  connection = createConnection()
  createAndResumeWorker()
  email = new Email(workerId, connection)
  sms = new SMS(workerId, connection)
  try {
    if(!isLogger){
      for(;;){
        await enqueueAndSend()
        await waitForMs(2000)
      }
    } else{
      for(;;){
        await finalize()
        await waitForMs(2000)
      }
    }
  } catch(err) {
    // TODO:  handle error!!!
    // Otherwise this worker will be useless
    logger.error(err)
  }
}
  
const messageWorker = {
  init,
}

expose(messageWorker)

export type MessageWorker = typeof messageWorker
export default MessageWorker