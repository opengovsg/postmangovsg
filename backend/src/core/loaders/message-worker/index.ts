
import { expose } from 'threads/worker'
import { Sequelize } from 'sequelize-typescript'
import { QueryTypes } from 'sequelize'
import get from 'lodash/get'
import config from '../../config'
import logger from '../../logger'
import Email from './email.class'
import SMS from './sms.class'


let connection: Sequelize, 
  workerId: number, 
  currentCampaignType: string,
  email: Email,
  sms: SMS

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

const getNextJob =  (): Promise< { jobId: number | undefined; campaignId: number | undefined; campaignType: string | undefined; rate: number | undefined}>  => {
  return connection.query('SELECT get_next_job(:worker_id);',
    { replacements: { 'worker_id': workerId }, type: QueryTypes.SELECT },
  ).then((result) => {
    const tuple = get(result, ('[0].get_next_job'), '()')
    const [jobId, campaignId, campaignType, rate] = tuple.substring(1, tuple.length - 1).split(',')
    if (jobId &&  campaignId && campaignType && rate) {
      currentCampaignType = campaignType
      logger.info(`${workerId}: getNextJob job_id=${jobId} campaign_id=${campaignId} campaign_type=${campaignType} rate=${rate}`) 
    }
    return { jobId, campaignId, campaignType, rate }
  })
}

const enqueueMessages = (jobId: number): Promise<void> => {
  return service().enqueueMessages(jobId)
}
  
const getMessages =  (jobId: number, rate: number): Promise<{id: number; recipient: string; params: any}[]>  => {
  return service().getMessages(jobId, rate)
}

const sendMessage = (message: { id: number; recipient: string; params: string }): Promise<void>  => {
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

const createAndResumeWorker = (): Promise<void> => {
  // TODO: On respawn with this same workerId, look for any existing jobs that are in SENDING state, and resume it.
  // Currently resume_worker just stops all the jobs for that campaign id.
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

  if(!isLogger){
    for(;;){
      enqueueAndSend()
      await waitForMs(2000)
    }
  } else{
    for(;;){
      finalize()
      await waitForMs(2000)
    }
  }
}
  
const messageWorker = {
  init,
}

expose(messageWorker)

export type MessageWorker = typeof messageWorker
export default MessageWorker