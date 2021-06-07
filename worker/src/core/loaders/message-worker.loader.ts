import process from 'process'
import worker from './message-worker'
import { loggerWithLabel } from '@core/logger'
import config from '@core/config'

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
      error: err,
      action: 'createMessageWorker',
    })
    process.exit(1)
  }
}

export default messageWorkerLoader
