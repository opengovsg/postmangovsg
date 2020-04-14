
import { expose } from 'threads/worker'
import { Sequelize } from 'sequelize-typescript'
import { QueryTypes } from 'sequelize'
import get from 'lodash/get'
import config from '../config'
import logger from '../logger'

let connection: Sequelize, 
  workerId: number, 
  currentCampaignType: string,
  currentJobId: number

const _enqueueMessagesEmail = async (jobId: number): Promise<void> => {
  return connection.query('SELECT enqueue_messages_email(:job_id); ',
    { replacements: { 'job_id': jobId }, type: QueryTypes.SELECT },
  ).then(() => {
    logger.info(`${workerId}: s_enqueueMessagesSms job_id=${jobId}`)
  })
}

const _enqueueMessagesSms   = async (jobId: number): Promise<void> => {
  return connection.query('SELECT enqueue_messages_sms(:job_id); ',
    { replacements: { 'job_id': jobId }, type: QueryTypes.SELECT },
  ).then(() => {
    logger.info(`${workerId}: s_enqueueMessagesSms job_id=${jobId}`)
  })
}

const enqueueMessages = async (jobId: number): Promise<void> => {
  switch(currentCampaignType){
  case 'EMAIL':
    return _enqueueMessagesEmail(jobId)
  case 'SMS':
    return _enqueueMessagesSms(jobId)
  default:
    throw new Error(`${currentCampaignType} not suppored`)
  }
}

const _getMessagesEmail  = async (jobId: number, rate: number): Promise<{id: number; recipient: string; params: any}[]> =>  {
  return connection.query('SELECT get_messages_to_send_email(:job_id, :rate) ;',
    { replacements: { 'job_id': jobId, rate }, type: QueryTypes.SELECT },
  ).then((result) => {
    return result.map(record => {
      const tuple = get(record, ('get_messages_to_send_email'), '()')
      const [id, recipient, params] = tuple.substring(1, tuple.length - 1).split(',')
      return { id: +id, recipient, params: params && JSON.parse(params) }
    })
  })
}

const _getMessagesSms  = async (jobId: number, rate: number): Promise<{id: number; recipient: string; params: any}[]>  => {
  return connection.query('SELECT get_messages_to_send_sms(:job_id, :rate) ;',
    { replacements: { 'job_id': jobId, rate }, type: QueryTypes.SELECT },
  ).then((result) => {
    return result.map(record => {
      const tuple = get(record, ('get_messages_to_send_sms'), '()')
      const [id, recipient, params] = tuple.substring(1, tuple.length - 1).split(',')
      return { id: +id, recipient, params: params && JSON.parse(params) }
    })
  })
}

  
const getMessages = async (jobId: number, rate: number): Promise<{id: number; recipient: string; params: any}[]>  => {
  switch(currentCampaignType){
  case 'EMAIL':
    return _getMessagesEmail(jobId,rate)
  case 'SMS':
    return _getMessagesSms(jobId,rate)
  default:
    throw new Error(`${currentCampaignType} not suppored`)
  } 
}

const _sendMessageEmail = async ({ id, recipient, params }: { id: number; recipient: string; params: string }): Promise<void> => {
  return Promise.resolve()
    .then(() => {
    // do some sending get a response
      return `${id}.${recipient}.${params}`
    })
    .then((messageId) => {
      return connection.query('UPDATE email_ops SET delivered_at=clock_timestamp(), message_id=:messageId WHERE id=:id;',
        { replacements: { id, messageId }, type: QueryTypes.UPDATE })
    })
    .then(() => {
      logger.info(`${workerId}: sendMessage jobId=${currentJobId} id=${id}`)
    })
}


const _sendMessageSms = async ({ id, recipient, params }: { id: number; recipient: string; params: string }): Promise<void> => {
  return Promise.resolve()
    .then(() => {
    // do some sending get a response
      return `${id}.${recipient}.${params}`
    })
    .then((messageId) => {
      return connection.query('UPDATE sms_ops SET delivered_at=clock_timestamp(), message_id=:messageId WHERE id=:id;',
        { replacements: { id, messageId }, type: QueryTypes.UPDATE })
    })
    .then(() => {
      logger.info(`${workerId}: sendMessage jobId=${currentJobId} id=${id}`)
    })
}
  
const sendMessage = (message: { id: number; recipient: string; params: string }): Promise<void>  => {
  switch(currentCampaignType){
  case 'EMAIL':
    return _sendMessageEmail(message)
  case 'SMS':
    return _sendMessageSms(message)
  default:
    throw new Error(`${currentCampaignType} not suppored`)
  }
}

const getNextJob = async (): Promise< { jobId: number | undefined; campaignId: number | undefined; campaignType: string | undefined; rate: number | undefined}>  => {
  return connection.query('SELECT get_next_job(:worker_id);',
    { replacements: { 'worker_id': workerId }, type: QueryTypes.SELECT },
  ).then((result) => {
    const tuple = get(result, ('[0].get_next_job'), '()')
    const [jobId, campaignId, campaignType, rate] = tuple.substring(1, tuple.length - 1).split(',')
    if (jobId &&  campaignId && campaignType && rate) {
      currentCampaignType = campaignType
      currentJobId = jobId
      logger.info(`${workerId}: getNextJob job_id=${jobId} campaign_id=${campaignId} campaign_type=${campaignType} rate=${rate}`) 
    }
    return { jobId, campaignId, campaignType, rate }
  })
}
  
const finalize = async (): Promise<void> => {
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
  
const init = async (index: number, reaper = false): Promise<void> => {
  connection = createConnection()
  workerId = index
  // TODO: On respawn with this same workerId, look for any existing jobs that are in SENDING state, and resume it.
  // Currently resume_worker just stops all the jobs for that campaign id.
  await connection.query(`
            INSERT INTO workers ("id",  "created_at", "updated_at") VALUES 
            (:worker_id, clock_timestamp(), clock_timestamp()) ON CONFLICT (id) DO NOTHING;
    
            SELECT resume_worker(:worker_id);
        `,
  { replacements: { 'worker_id': workerId }, type: QueryTypes.INSERT },
  )
  
  if(!reaper){
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