import { Worker, spawn, ModuleThread } from 'threads'
import MessageWorker from './message-worker'
import logger from '@core/logger'
import config from '@core/config'

const createMessageWorker = async (workerId: string, isLogger = false): Promise<ModuleThread<MessageWorker>> => {
  const worker = await spawn<MessageWorker>(new Worker('./message-worker'))
  try{
    await worker.init(workerId, isLogger)
  }catch(err){
    logger.error(`Worker died. ${err.stack}`)
    process.exit(1)
  }
  return worker
}

const messageWorkerLoader = async (): Promise<void> => {
  let i = 1
  const workers = []
  for(; i <= config.messageWorker.numSender; i++){
    workers.push(createMessageWorker(String(i)))
  }
  for(; i <=  config.messageWorker.numSender + config.messageWorker.numLogger; i++){
    workers.push(createMessageWorker(String(i), true))
  }
  return Promise.all(workers)
    .then(() => {
      logger.info('MessageWorker loaded')
    })
}

export default messageWorkerLoader