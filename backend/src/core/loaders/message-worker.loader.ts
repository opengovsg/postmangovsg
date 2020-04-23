import { Worker, spawn, ModuleThread } from 'threads'
import MessageWorker from './message-worker'
import logger from '@core/logger'
import config from '@core/config'

const createMessageWorker = async (workerId: string, isLogger = false): Promise<ModuleThread<MessageWorker>> => {
  const worker = await spawn<MessageWorker>(new Worker('./message-worker'))
  worker.init(workerId, isLogger)
  return worker
}

const messageWorkerLoader = async (): Promise<void> => {
  let i = 1
  for(; i <= config.messageWorker.numSender; i++){
    createMessageWorker(String(i))
  }
  for(; i <=  config.messageWorker.numSender + config.messageWorker.numLogger; i++){
    createMessageWorker(String(i), true)
  }
  logger.info('MessageWorker loaded')
}

export default messageWorkerLoader