import config from '@core/config'
import { loggerWithLabel } from '@core/logger'
import process from 'process'

import worker from './message-worker'

const logger = loggerWithLabel(module)

const messageWorkerLoader = async (): Promise<void> => {
  const workerId = String(1)
  const isLogger = config.get('messageWorker.numLogger') > 0

  try {
    process.on(
      config.get('env') === 'development' ? 'SIGINT' : 'SIGTERM',
      worker.shutdown
    )
    await worker.start(workerId, isLogger)
  } catch (err) {
    logger.error({
      message: 'Worker died',
      workerId,
      isLogger,
      error: `${(err as Error).stack}`.substring(0, 1000),
      action: 'createMessageWorker',
    })
    worker.shutdown()
  }
}

export default messageWorkerLoader
