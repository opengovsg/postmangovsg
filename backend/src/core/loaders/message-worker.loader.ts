import { Worker, spawn, ModuleThread } from 'threads'
import MessageWorker from './message-worker'
import logger from '@core/logger'
import config from '@core/config'
const createMessageWorker = async (workerId: number, reaper = false): Promise<ModuleThread<MessageWorker>> => {
  const worker = await spawn<MessageWorker>(new Worker('./message-worker'))
  worker.init(workerId, reaper)
  return worker
}

const messageWorkerLoader = async (): Promise<void> => {
  let i
  for(i=1; i <= config.messageWorker.numSender; i++){
    createMessageWorker(i)
  }
  for(; i <=  config.messageWorker.numSender + config.messageWorker.numLogger; i++){
    createMessageWorker(i, true)
  }
  logger.info('MessageWorker loaded')
}

export default messageWorkerLoader