import { Worker, spawn, ModuleThread } from 'threads'
import MessageWorker from './message-worker'
import Logger from '@core/logger'
import config from '@core/config'

const logger = Logger.loggerWithLabel(module)

const createMessageWorker = async (
  workerId: string,
  isLogger = false
): Promise<ModuleThread<MessageWorker>> => {
  const worker = await spawn<MessageWorker>(new Worker('./message-worker'))
  try {
    await worker.init(workerId, isLogger)
  } catch (err) {
    logger.error({
      message: 'Worker died',
      workerId,
      isLogger,
      error: err,
      action: 'createMessageWorker',
    })
    process.exit(1)
  }
  return worker
}

const messageWorkerLoader = async (): Promise<void> => {
  let i = 1
  const workers = []
  for (; i <= config.get('messageWorker.numSender'); i++) {
    workers.push(createMessageWorker(String(i)))
  }
  for (
    ;
    i <=
    config.get('messageWorker.numSender') +
      config.get('messageWorker.numLogger');
    i++
  ) {
    workers.push(createMessageWorker(String(i), true))
  }
  return Promise.all(workers).then(() => {
    logger.info({
      message: 'MessageWorker loaded',
      action: 'messageWorkerLoader',
    })
  })
}

export default messageWorkerLoader
