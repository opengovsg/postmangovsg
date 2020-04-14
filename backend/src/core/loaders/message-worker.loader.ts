import { Worker, spawn, ModuleThread } from 'threads'
import MessageWorker from './message-worker'
import logger from '@core/logger'

const createMessageWorker = async (workerId: number, reaper = false): Promise<ModuleThread<MessageWorker>> => {
  const worker = await spawn<MessageWorker>(new Worker('./message-worker'))
  worker.init(workerId, reaper)
  return worker
}

const messageWorkerLoader = async (): Promise<void> => {
  createMessageWorker(1)
  createMessageWorker(2, true)
  logger.info('MessageWorker loaded')
}

export default messageWorkerLoader